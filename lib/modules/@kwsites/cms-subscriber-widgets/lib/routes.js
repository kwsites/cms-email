const _ = require('lodash');

const LIST_SOURCE = 'list-source';
const CONFIRMATION_MESSAGE = 'confirmation-message';

module.exports = (self, options) => {

   self.routes = {
      ...(self.routes || {}),

      submitSubscription (req, res) {

         debugger;
         self.forms.createSubscriber(
            req,
            _.get(req.body, LIST_SOURCE),
            _.get(req.body, CONFIRMATION_MESSAGE),
            (err) => {

               if (!err) {
                  return res.send({status: 'ok'});
               }

               res.send({
                  status: 'error',
                  error: String(err.message).replace(/^error\W+/i, '')
               });
            }
         );

      },

   };

   self.addRoutes = () => {
      self.route('post', 'submit', self.routes.submitSubscription);
   };

};
