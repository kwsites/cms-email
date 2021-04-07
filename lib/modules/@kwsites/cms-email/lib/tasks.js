const _ = require('lodash');
const mustache = require('mustache');
const nodeMailer = require('nodemailer');

module.exports = (self, options) => {

   self.tasks = {
      dequeue (apos, argv, callback) {

         const onDocsReady = (err, docs) => {
            if (err) {
               return callback(err);
            }

            if (!docs.length) {
               console.log(`${ self.__meta.name }: No messages queued for delivery`);
               return callback(null);
            }

            const updates = [];
            const messages = docs.map(doc => {
               const {recipient, sender, subject, message, data} = doc;

               return sendEmail(self.transporter, recipient, sender, subject, message, data)
                  .then(() => updates.push(doc.id))
                  .catch((err) => console.error(err));
            });

            Promise.all(messages).then(async () => {

               await self.queue.update(
                  {id: {$in: updates}},
                  {$set: {sent: true}},
                  {multi: true}
               );

               callback(null);

            });
         };

         self.queue.find({sent: false})
            .sort({created: 1})
            .limit(20)
            .toArray(onDocsReady);
      },
   };

   self.addTasks = _.wrap(self.addTasks, (addTasks) => {
      addTasks();

      self.apos.tasks.add(self.__meta.name,
         'dequeue',
         'Sends queued emails',
         self.tasks.dequeue,
      );

   });

   self.createTransporter = () => {
      self.transporter = !options.enabled
         ? {
            sendMail (options, callback) {
               setImmediate(() => callback(null, options))
            }
         }
         : nodeMailer.createTransport({
            host: options.emailHost,
            port: options.emailPort,
            ...(options.transport || {}),
         });
   }

};


function sendEmail (transporter, _recipient, _sender, _subject, _message, data) {
   const to = mustache.render(_recipient, data);
   const from = mustache.render(_sender, data);
   const html = mustache.render(_message, data);
   const subject = mustache.render(_subject, data);

   return new Promise((done, reject) => {
      transporter.sendMail({
         from,
         to,
         subject,
         html
      }, (err, info) => {

         if (err) {
            reject(typeof err === 'string' ? new Error(err) : err);
         }
         else {
            done(info);
         }
      });
   });
}


