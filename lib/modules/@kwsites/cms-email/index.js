module.exports = {

   extend: 'apostrophe-pieces',

   name: 'emails',
   label: 'Email',

   pluralLabel: 'Emails',

   arrangeFields: [
      {
         name: 'basic',
         label: 'Basics',
         fields: ['title', 'sender', 'recipient', 'subject', 'message'],
      },
      {
         name: 'admin',
         label: 'Admin',
         fields: ['published', 'tags'],
      }
   ],

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
         type: 'area',
         label: 'Message',
         required: true,
         options: {
            widgets: {
               'apostrophe-rich-text': {
                  toolbar: ['Styles', 'Bold', 'Italic', 'Link'],
                  styles: [
                     {
                        name: 'Heading',
                        element: 'h2',
                        attributes: {style: 'font-weight: bold; font-size: 1.5em; padding: 0; margin: 0.5em 0'}
                     }
                  ]
               },
               'apostrophe-images': {
                  renderer: 'single',
                  multiRenderer: 'email',
               }
            },
         },
      }
   ],

   enabled: false,
   emailRecipient: '',
   emailSender: '',
   mailMergePermission: 'admin',

   contactsModule: '@kwsites/cms-subscriber',

   afterConstruct (self) {
      self.createTransporter();
      self.addRoutes();
   },

   construct (self, options, onReady) {

      require('./lib/routes')(self, options);
      require('./lib/recipients')(self, options);
      require('./lib/email')(self, options);
      require('./lib/tasks')(self, options);

      self.getContactsModule = () => self.apos.modules[options.contactsModule];

      self.getMailMergePermission = () => options.mailMergePermission;

      self.apos.db.collection(self.__meta.name, (err, collection) => {
         self.queue = collection;
         onReady(err || null);
      });

      self.beforeSave = function (req, piece, opt, callback) {
         piece.sender = piece.sender || options.emailSender;
         piece.recipient = piece.recipient || options.emailRecipient;

         return callback();
      };


   }

};
