
const _ = require('lodash');

module.exports = {

   extend: 'apostrophe-pieces-pages',

   perPage: 50,

   subscriberModule: '@kwsites/cms-subscriber',

   afterConstruct (self) {
      self.addRoutes();
   },

   construct (self, options) {

      require('./lib/routes')(self, options);

      self.forms = self.apos.modules[options.subscriberModule];

      self.beforeIndex = _.wrap(self.beforeIndex, (superFn, req, callback) => {
         if (!self.apos.permissions.can(req, `edit-${ self.name }`)) {
            req.notFound = true;
            return callback(null);
         }
         superFn(req, callback);
      });

      self.beforeShow = _.wrap(self.beforeShow, (superFn, req, callback) => {
         if (req.data.optIn) {
            return self.forms.optIn(req.data.piece, (err) => {
               err ? callback(err) : superFn(req, callback);
            });
         }

         superFn(req, callback);
      });

      self.dispatchAll = _.wrap(self.dispatchAll, (superFn, ...args) => {

         self.dispatch('/:slug/confirm', function (req, callback) {
            req.data.optIn = true;
            self.showPage(req, callback);
         });

         superFn(...args);

      });

   },

};
