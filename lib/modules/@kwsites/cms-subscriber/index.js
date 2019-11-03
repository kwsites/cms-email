const _ = require('lodash');

module.exports = {

   extend: 'apostrophe-pieces',

   name: 'subscription',
   label: 'Subscriber',

   addFields: [
      {
         name: 'contact-name',
         type: 'string',
         label: 'Name',
         def: '',
      },
      {
         name: 'contact-email',
         type: 'string',
         label: 'Email',
         required: true,
         def: null,
      },

      {
         // set to false when the user chooses to unsubscribe
         name: 'contact-subscribed',
         type: 'boolean',
         label: 'Subscribed',
         def: true
      },

      {
         // how often to receive blog post emails
         name: 'contact-frequency',
         type: 'select',
         choices: [
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'never', label: 'Never' },
         ],
         def: 'daily'
      },

      {
         // where does this contact come from
         name: 'contact-event-source',
         type: 'string',
         label: 'Source',
         def: '',
      },
   ],

   permissionsFields: false,

   subscriptionConfirmationEmail: 'subscription-confirmation',
   emailModule: '@kwsites/cms-email',

   afterConstruct (self) {
      self.setSubmitSchema();
   },

   beforeConstruct (self, options) {

      options.addColumns = [
         {
            name: 'contact-email',
            label: 'Email'
         },
         {
            name: 'contact-frequency',
            label: 'Frequency'
         },
         {
            name: 'contact-subscribed',
            label: 'Subscribed'
         },
         {
            name: 'opt-in-at',
            label: 'Opt In'
         }
      ];

      options.addFilters = [
         {
            name: 'contact-subscribed',
            choices: [
               {
                  value: true,
                  label: 'Yes'
               },
               {
                  value: false,
                  label: 'No'
               },
               {
                  value: null,
                  label: 'All'
               }
            ],
            def: true
         }
         ,
         {
            name: 'optIn',
            choices: [
               {
                  value: true,
                  label: 'Yes'
               },
               {
                  value: false,
                  label: 'No'
               },
               {
                  value: null,
                  label: 'All'
               }
            ],
            def: null
         }
      ].concat(options.addFilters || []);

   },

   construct (self, options) {

      options.addColumns = options.addColumns.filter(_.negate(_.matchesProperty('name', 'title')));

      self.beforeInsert = function(req, piece, options, callback) {
         const email = piece['contact-email'];

         self.find(req, { 'contact-email': email }).toCount((err, count) => {
            if (err || count) {
               return callback(err || new Error(`Duplicate email address: ${ email }`));
            }

            piece['opt-in'] = false;
            callback();
         });

      };

      self.beforeSave = function(req, piece, options, callback) {
         piece.published = piece.published !== false;
         piece.title = piece.title || self.apos.utils.generateId();

         return callback();
      };

      self.setSubmitSchema = function () {

         const contactFieldNames = self.schema.map(s => s.name).filter(n => /^(contact|event)\-/.test(n));

         // only those fields that have contact or event at the start of their names
         // should be submitted all others can be ignored.
         self.submitSchema = self.apos.schemas.subset(self.schema, [...contactFieldNames]);
         self.udpateSchema = self.apos.schemas.subset(self.schema, ['slug', ...contactFieldNames]);

      };

      self.optIn = function (piece, callback) {
         const $set = {'opt-in': true, 'opt-in-at': new Date(), 'updatedAt': new Date()};

         self.apos.docs.db.update(
            { _id: piece._id, type: 'subscription' },
            { $set },
            (err, update) => {
               const success = !err && _.get(update, 'result.n') > 0;
               const message = success ? 'OK' : 'FAILED';
               console.log(`${ self.__meta.name }:optIn update ${ piece['contact-email'] } : ${ message }`);

               if (success) {
                  Object.assign(piece, $set);
               }

               callback(err);
            }
         );
      };

      /**
       * Edit a subscriber's details based on the form data in the request's body.
       *
       * @param req
       * @param callback
       */
      self.edit = async (req, callback) => {
         const piece = {};

         try {
            await convert();
            await update();
            callback();
         }
         catch (e) {
            callback(e);
         }

         function convert () {
            return new Promise((done, fail) => {
               self.apos.schemas.convert(req, self.udpateSchema, 'form', req.body, piece, (err) => {
                  if (err) {
                     return fail(new Error(err));
                  }

                  Object.keys(piece).forEach(key => {
                     if (piece[key] === '') {
                        delete  piece[key];
                     }
                  });

                  done();
               });
            });
         }

         function update () {
            return new Promise((done, fail) => {
               self.apos.docs.db.update({ slug: piece.slug, type: options.name }, { $set: piece }, (err) => {
                  if (err) {
                     return fail(new Error(err));
                  }

                  done();
               });
            });
         }

      };

      /**
       * Handle the contact form being submitted, converts the submit data to a valid `piece`,
       * inserts that to the database then emails accordingly.
       */
      self.submit = async (req, callback) => {
         try {
            const converted = await convert();
            const inserted = await insert(converted);
            await email(await retrieve(inserted));
            callback();
         }
         catch (err) {
            console.log(`Error submitting subscription: ${ err }`);
            callback(err);
         }

         function convert () {
            return new Promise((done, fail) => {
               const subscription = {};
               self.apos.schemas.convert(req, self.submitSchema, 'form', req.body, subscription, (err) => {
                  if (err) {
                     return fail(new Error(err));
                  }
                  done(subscription);
               });
            });
         }

         function insert (subscription) {
            return new Promise((done, fail) => {
               self.insert(req, subscription, {permissions: false}, (err, doc) => {
                  if (err) {
                     return fail(new Error(err));
                  }
                  done(doc);
               });
            });
         }

         function retrieve (subscription) {
            return new Promise((done, fail) => {
               self.find(req, { slug: subscription.slug })
                  .toObject((err, doc) => {
                     err ? fail(new Error(err)) : done(doc);
                  })
            });
         }

         function email (subscription) {
            const email = self.apos.modules[options.emailModule];
            const data = Object.assign({ 'subscription-url': `${ subscription._url }/confirm` }, subscription);

            return email.sendEmail(options.subscriptionConfirmationEmail, data);
         }
      };
   }

};
