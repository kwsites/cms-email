
module.exports = (self, options) => {

   self.routes = {
      ...(self.routes || {}),

      submitSubscription (req, res) {
         self.forms.submit(req, (err) => {
            if (!err) {
               return res.send({status: 'ok'});
            }

            res.send({
               status: 'error',
               error: String(err.message).replace(/^error\W+/i, '')
            });
         });
      },

      editSubscription (req, res) {
         self.forms.edit(req, (err) => {
            res.send({ status: err ? 'error' : 'ok' });
         });
      },

   };

   self.addRoutes = () => {
      self.route('post', 'submit', self.routes.submitSubscription);
      self.route('post', 'edit', self.routes.editSubscription);
   };

};
