const _ = require('lodash');

module.exports = (self, options) => {

   self.scheduleEmail = (recipient,
                         sender,
                         subject,
                         message,
                         data,
                         callback) => {

      const id = `email-${ self.apos.utils.generateId() }`;

      self.queue.insert({
         id,
         sent: false,
         created: new Date(),
         recipient,
         sender,
         subject,
         message,
         data
      }, callback);

      return id;

   };

   // TODO #12: change to (slug, subscriber, data)
   self.sendEmail = (slug, data) => {
      return new Promise((done, fail) => {

         const req = self.apos.tasks.getReq();
         const anonReq = self.apos.tasks.getAnonReq({
            __: _.identity,
            session: {},
         });

         self.find(req, {slug}, {message: 1, recipient: 1, sender: 1, subject: 1})
            .toObject((err, email) => {
               if (err) {
                  return fail(err instanceof Error ? err : new Error(err));
               }

               if (!email) {
                  return fail(new Error(`404: email name not found: ${slug}`));
               }

               const {recipient, sender, subject} = email;
               const message = self.render(anonReq, 'email', email);

               self.scheduleEmail(
                  recipient,
                  sender,
                  subject,
                  message,
                  data,
                  (err) => err ? fail(err) : done()
               );
            });
      });
   };

};
