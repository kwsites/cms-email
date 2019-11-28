const _ = require('lodash');

module.exports = {

   extend: 'apostrophe-widgets',

   label: 'Email Subscription',

   scene: 'user',

   pieceModule: '@kwsites/cms-subscriber',

   thanksMessage: 'Thank you for subscribing!',

   addFields: [
      {
         type: 'boolean',
         name: 'isListRegistration',
         label: 'Use as list registration',
         choices: [
            {
               value: true,
               showFields: [
                  'source',
               ],
            }
         ],
      },
      {
         type: 'string',
         name: 'source',
         label: 'Registration Source',
      },
      {
         type: 'boolean',
         name: 'layoutIncludeName',
         label: 'Show name field',
         def: true,
      },
      {
         type: 'boolean',
         name: 'layoutIncludeOptIn',
         label: 'Show opt-in field',
         def: true,
      },
      {
         type: 'string',
         name: 'layoutButtonText',
         label: 'Button Text',
         def: 'Subscribe...',
      },
      {
         type: 'string',
         name: 'thanksMessage',
         label: 'Thanks Message',
         def: 'Thank you for subscribing!',
      },
      {
         type: 'boolean',
         name: 'thanksEmailSend',
         label: 'Confirmation Email',
         def: true,
         choices: [
            {
               value: true,
               showFields: [
                  'thanksEmail', 'thanksEmailAlways',
               ],
            }
         ]
      },
      {
         type: 'string',
         name: 'thanksEmail',
         help: 'Name of a confirmation email to send to this subscriber, leave empty to use the default message',
         label: 'Confirmation Email',
      },
      {
         type: 'boolean',
         name: 'thanksEmailAlways',
         help: `When the user has already received an email with this name it won't be sent again unless this box is ticked`,
         label: 'Force Confirmation Email',
         def: false,
      },
      {
         type: 'integer',
         name: 'thanksTemporary',
         label: 'Temporary Thanks Message',
         help: 'Have the thanks message revert to the form after this many seconds (zero for not temporary)',
         def: 0,
      },
   ],

   arrangeFields: [
      {
         name: 'layout',
         label: 'Layout',
         fields: [ 'layoutIncludeOptIn', 'layoutIncludeName', 'layoutButtonText' ]
      },
      {
         name: 'thanks',
         label: 'Thanks',
         fields: [ 'thanksMessage', 'thanksTemporary', 'thanksEmailSend', 'thanksEmail', 'thanksEmailAlways' ],
      },
      {
         name: 'lists',
         label: 'Lists',
         fields: ['isListRegistration', 'source'],
      }
   ],

   afterConstruct (self) {

      self.addRoutes();

   },

   construct (self, options) {

      self.forms = self.apos.modules[options.pieceModule];

      require('./lib/routes')(self, options);
      require('./lib/assets')(self, options);

      self.getSubmitSchema = () => {
         return self.forms.submitSchema;
      };

      self.output = function (widget, options) {
         return self.partial(self.template, {
            widget: widget,
            options: options,
            manager: self,
            schema: self.getSubmitSchema(),
         });
      };

      self.getCreateSingletonOptions = _.wrap(self.getCreateSingletonOptions, (fn, ...args) => {

         return {
            ...fn(...args),

            submitSchema: self.getSubmitSchema(),
            piece: self.forms.newInstance(),
         };
      });

   }

};
