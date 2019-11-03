
module.exports = (self, options) => {

   /**
    * Adds subscription details to the contact object
    */
   self.enrichedSubscriber = (contact) => {

      const output = {
         'subscription-confirmed': contact['opt-in'],
         'subscription-confirm-url': `${ contact._url }/confirm`,
         'subscription-url': contact._url,
      };

      Object.keys(contact).forEach((key) => {
         if (/^contact-/.test(key)) {
            output[key] = contact[key];
         }
      });

      return output;
   };

   self.getContacts = (req, subscribeRequired = true, filter = {}, ...projectionFields) => {
      const mod = self.getContactsModule();

      const criteria = {};
      const projection = !projectionFields.length
         ? undefined
         : projectionFields.reduce((all, item) => { all[item] = 1; return all; }, {})
      ;

      if (subscribeRequired) {
         criteria['contact-subscribed'] = true;
      }

      return new Promise(done => {
         mod.find(req, Object.assign(criteria, filter), projection).toArray((err, docs) => done(err ? [] : docs));
      });
   };

};
