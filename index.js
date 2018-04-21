const _ = require('lodash');
const moment = require('moment');
const mustache = require('mustache');
const nodeMailer = require('nodemailer');

module.exports = {

   extend: 'apostrophe-pieces',

   enabled: false,

   name: 'Email',

   label: 'Email',

   addFields: [
      {
         name: 'title',
         label: 'Type',
         type: 'string',
         required: true
      },
      {
         name: 'sender',
         type: 'string',
         label: 'Sender'
      },
      {
         name: 'recipient',
         type: 'string',
         label: 'Recipient'
      },
      {
         name: 'subject',
         type: 'string',
         label: 'Subject'
      },
      {
         name: 'message',
         type: 'singleton',
         label: 'Message',
         required: true,
         widgetType: 'apostrophe-rich-text',
         options: {}
      }
   ],

   construct (self, options) {

      self.beforeSave = function (req, piece, options, callback) {
         piece.sender = piece.sender || options.sender;
         piece.recipient = piece.recipient || options.recipient;

         return callback();
      };

      self.sendEmail = function (slug, data) {
         return new Promise((done, fail) => {

            const req = self.apos.tasks.getReq();
            self.find(req, {slug}, {message: 1, recipient: 1, sender: 1, subject: 1})
               .toObject((err, email) => {
                  if (err) {
                     return fail(err instanceof Error ? err : new Error(err));
                  }

                  if (!email) {
                     return fail(new Error(`404: email name not found: ${slug}`));
                  }

                  const {recipient, sender, subject} = email;
                  const message = email.message.items.map(item => item.content).join('\n');

                  sendEmail(recipient, sender, subject, message, data, self.transporter)
                     .then(done)
                     .catch(fail);
               });
         });
      };

      self.apos.tasks.add(self.__meta.name, 'blog',
         'Usage: node app hot-email:blog\n\n' +
         'Schedules an email to all subscribers for blogs being issued today.',
         function (apos, argv, callback) {
            const req = self.apos.tasks.getReq();

            let work = Promise.all([
               getBlogs(req, self.apos.modules['hot-blog']),
               getSubscribers(req, self.apos.modules['hot-subscriber'])
            ]);

            work = work.then(([blog, subscribers]) => {

               if (!blog) {
                  return;
               }

               return Promise.all(subscribers.map(subscriber => {

                  return self.sendEmail('blog-notification', {
                     'blog-title': blog.title,
                     'blog-description': blog.description,
                     'blog-url': blog._url,
                     'contact-email': subscriber['contact-email'],
                     'subscription-url': subscriber._url,
                  });

               }));
            });

            work.then(() => callback()).catch((err) => callback(err));
         }
      );
   },

   afterConstruct (self) {
      const options = {
         sendmail: true,
         newline: 'unix',
         path: '/usr/sbin/sendmail'
      };

      self.transporter = createTransport(
         self.options.enabled,
         _.assign(options, _.get(self, 'options.transport', {}))
      );
   }

};

function createTransport (enabled, transport) {
   if (!enabled) {
      return {
         sendMail (options, callback) {
            setImmediate(() => callback(null, options));
         }
      };
   }

   const options = {
      sendmail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail'
   };

   _.assign(options, transport);

   return nodeMailer.createTransport(options);
}

function sendEmail (_recipient, _sender, _subject, _message, data, transporter) {
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

function getBlogs (req, mod) {
   return new Promise(done => {
      const now = moment().format('YYYY-MM-DD');

      mod.find(req, {publishedAt: {$gte: now, $lte: now}})
         .toObject((err, doc) => done(err ? null : doc));
   });
}

function getSubscribers (req, mod) {
   return new Promise(done => {
      mod.find(req, {'contact-subscribed': true})
         .toArray((err, docs) => done(err ? [] : docs));
   });
}
