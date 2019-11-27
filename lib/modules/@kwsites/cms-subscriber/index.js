const _ = require('lodash');

const CONTACT_EMAIL = 'contact-email';
const CONTACT_NAME = 'contact-name';
const CONTACT_LIST = 'subscriber-lists';
const OPTED_IN = 'opt-in';
const MESSAGE_HISTORY = 'subscriber-message-history';

/*
   TODO:

   - Check the opt-in workflow for GDPR
   - Add a 'confirmed' workflow for a user to self-confirm the email address

 */
module.exports = {

   extend: 'apostrophe-pieces',

   name: 'subscription',
   label: 'Subscriber',

   // disable this type from appearing in apostrophe-search results
   searchable: false,

   arrangeFields: [
      {
         name: 'contact',
         label: 'Contact',
         fields: [CONTACT_NAME, CONTACT_EMAIL],
      },
      {
         name: 'subscription',
         label: 'Subscription',
         fields: ['contact-subscribed', 'contact-frequency', CONTACT_LIST],
      },
      {
         name: 'default',
         label: 'Admin',
         fields: ['title', 'slug', 'published', 'tags'],
      }
   ],

   addFields: [
      {
         name: CONTACT_NAME,
         type: 'string',
         label: 'Name',
         def: '',
      },

      {
         name: CONTACT_EMAIL,
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
            {value: 'daily', label: 'Daily'},
            {value: 'weekly', label: 'Weekly'},
            {value: 'never', label: 'Never'},
         ],
         def: 'daily'
      },

      {
         // where does this contact come from
         name: CONTACT_LIST,
         type: 'tags',
         label: 'Lists',
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
            name: CONTACT_EMAIL,
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
         },
         {
            name: CONTACT_LIST,
            label: 'Lists'
         },
      ];

      options.addFilters = [
         { name: CONTACT_LIST },
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
         },

         ...(options.addFilters || []),
      ];
   },

   construct (self, options) {

      options.addColumns = options.addColumns.filter(_.negate(_.matchesProperty('name', 'title')));

      self.beforeInsert = function (req, piece, options, callback) {
         const email = piece[CONTACT_EMAIL];

         self.find(req, {[CONTACT_EMAIL]: email}).toCount((err, count) => {
            if (err || count) {
               return callback(err || new Error(`Duplicate email address: ${ email }`));
            }

            piece[OPTED_IN] = false;
            piece[MESSAGE_HISTORY] = {};
            callback();
         });
      };

      self.beforeSave = function (req, piece, options, callback) {
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
            {_id: piece._id, type: 'subscription'},
            {$set},
            (err, update) => {
               const success = !err && _.get(update, 'result.n') > 0;
               const message = success ? 'OK' : 'FAILED';
               console.log(`${ self.__meta.name }:optIn update ${ piece[CONTACT_EMAIL] } : ${ message }`);

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
               self.apos.docs.db.update({slug: piece.slug, type: options.name}, {$set: piece}, (err) => {
                  if (err) {
                     return fail(new Error(err));
                  }

                  done();
               });
            });
         }

      };

      self.createSubscriber = async (
         req,
         setContactSource = '',
         confirmationEmail,
         callback) => {

         try {
            const converted = await convert(req, self.submitSchema);
            const subscription = await findOrCreateEmail(req, converted[CONTACT_EMAIL]);
            const updated = await updateAndRefreshSubscription(req, subscription, converted, setContactSource);

            await sendEmailToSubscriber(req, updated,
               typeof confirmationEmail === 'string' || confirmationEmail === false
                  ? confirmationEmail
                  : options.subscriptionConfirmationEmail,
               typeof confirmationEmail === 'string' || confirmationEmail === true
            );

            callback();
         }

         catch (err) {
            console.log(`Error submitting subscription: ${ err }`);
            callback(err);
         }

      };

      /**
       * Handle the contact form being submitted, converts the submit data to a valid `piece`,
       * inserts that to the database then emails accordingly.
       */
      self.submit = async (req, callback) => {
         try {
            const converted = await convert(req, self.submitSchema);
            const inserted = await insert(converted);
            await email(await retrieve(inserted));
            callback();
         }
         catch (err) {
            console.log(`Error submitting subscription: ${ err }`);
            callback(err);
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
               self.find(req, {slug: subscription.slug})
                  .toObject((err, doc) => {
                     err ? fail(new Error(err)) : done(doc);
                  })
            });
         }

         function email (subscription) {
            const email = self.apos.modules[options.emailModule];
            const data = Object.assign({'subscription-url': `${ subscription._url }/confirm`}, subscription);

            return email.sendEmail(options.subscriptionConfirmationEmail, data);
         }
      };


      function retrieveByEmail (req, email) {
         return retrieve(req, {[CONTACT_EMAIL]: email});
      }

      function retrieveBySlug (req, slug) {
         return retrieve(req, {slug});
      }

      function retrieve (req, criteria) {
         return new Promise((done, fail) => {
            self.find(req, criteria).toObject((err, doc) => {
               err ? fail(toError(err)) : done(doc);
            });
         });
      }

      function insertEmail (req, email) {
         return new Promise((done, fail) => {
            self.insert(req, { [CONTACT_EMAIL]: email }, {permissions: false}, (err) => {
               if (err) {
                  return fail(toError(err));
               }

               retrieveByEmail(req, email).then(done, fail);
            });
         });
      }

      async function findOrCreateEmail (req, email) {
         return await retrieveByEmail(req, email) || await insertEmail(req, email);
      }

      function convert (req, schema) {

         return new Promise((done, fail) => {
            const subscription = {};
            self.apos.schemas.convert(req, schema, 'form', req.body, subscription, (err) => {

               if (err) {
                  return fail(new Error(err));
               }

               _.forEach(subscription, (value, key) => {
                  if (value === '') {
                     delete subscription[key];
                  }
               });

               done(subscription);
            });
         });

      }

      async function sendEmailToSubscriber (req, subscription, emailId, forceSend = false) {
         if (typeof emailId !== 'string') {
            return Promise.resolve();
         }

         if (_.has(subscription[MESSAGE_HISTORY], emailId) && !forceSend) {
            return Promise.resolve();
         }

         const email = self.apos.modules[options.emailModule];
         const data = Object.assign({'subscription-url': `${ subscription._url }/confirm`}, subscription);

         if (_.has(subscription[MESSAGE_HISTORY], emailId) && !forceSend) {
            return Promise.resolve();
         }

         // TODO: this could be a fire & forget rather than awaiting the result
         await _updateSubscriber(req, subscription.slug, {
            $addToSet: {
               [`${MESSAGE_HISTORY}.${emailId}`]: new Date(),
            },
         });

         return email.sendEmail(emailId, data);
      }


      function updateAndRefreshSubscription (req, subscriber, $set, addLists, removeLists) {
         const updates = {};

         // update string properties
         if (!_.isEmpty($set)) {

            // TODO - ensure filtering by the keys of updateSchema
            updates.$set = $set;
         }

         if (!_.isEmpty(addLists)) {
            const addToSet = [].concat(addLists).map(_.toLower);

            updates.$addToSet = {
               [CONTACT_LIST]: addToSet.length > 1 ? { $each: addToSet } : addToSet[0],
            };
         }

         if (!_.isEmpty(removeLists)) {
            const pull = [].concat(removeLists).map(_.toLower);

            updates.$pull = {
               [CONTACT_LIST]: pull.length ? { $in: pull } : pull[0],
            };
         }

         return new Promise((done, fail) => {
            _updateSubscriber(req, subscriber.slug, updates).then(
               (updated) => retrieveBySlug(req, subscriber.slug).then(done, fail),
               fail,
            );
         });
      };

      function _updateSubscriber (req, slug, updates) {
         return new Promise((done, fail) => {
            self.apos.docs.db.update({slug, type: options.name}, updates, (err, update) => {
               if (err) {
                  return fail(new Error(err));
               }

               done(_.get(update, 'result.ok', 0));
            });
         });
      }

      function toError (err) {
         return typeof err === 'string' ? new Error(err) : err;
      }

   }

};


