
module.exports = {
   construct: function(self, options) {

      // If set to true, the future flag allows us to get posts
      // with a publication date in the future. By default,
      // this is false by default

      self.addFilter('subscribed', {
         def: null,

         finalize: function() {
            const subscribed = self.get('subscribed');
            if (subscribed === null) {
               return;
            }

            self.and({
               'contact-subscribed': subscribed
            });
         },
         safeFor: 'public',

         launder: self.apos.launder.booleanOrNull
      });

      self.addFilter('optIn', {
         def: null,

         finalize: function() {
            const filterValue = self.get('optIn');

            if (filterValue !== null) {
               self.and({ 'opt-in': filterValue });
            }
            else {
               self.and({ 'opt-in': {$in: [true, false, null]} })
            }

         },
         safeFor: 'public',

         launder: self.apos.launder.booleanOrNull
      });

   }
};
