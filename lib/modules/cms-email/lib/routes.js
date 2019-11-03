module.exports = (self, options) => {

   self.routes = {


      /**
       * Final step in the POST `/html` route, retrieves and sends the HTML content of the selected email
       */
      emailContent (req, res) {
         self.find(req, {_id: req.body.id}).toObject((err, data) => {
            res.send({html: err || !data ? '' : self.render(req, 'email', data)});
         });
      },

      /**
       * Final step in the POST `/contact-group` route, retrieves and returns the selected contacts
       */
      async contactGroup (req, res) {
         const data = await self.getContacts(req, !!req.body['contact-subscribed'],
            {'contact-event-source': req.body['contact-group']}, 'contact-email', 'contact-subscribed');

         if (!data || !data.length) {
            return res.status(404).send(new Error('Cannot find any matching contacts'));
         }

         res.send({data});
      },

      async sendMailMerge (req, res) {
         let contacts = [];
         const {message, subject, sender} = req.body;

         if (req.body['contact-group']) {
            contacts = await self.getContacts(
               req, !!req.body['contact-subscribed'], {'contact-event-source': req.body['contact-group']}
            );
         }

         const messages = contacts.map(contact => {

            return self.scheduleEmail(
               contact['contact-email'],
               sender,
               subject,
               message,
               self.enrichedSubscriber(contact),
               (err) => {
                  console.log(err
                     ? `Error sending mail-merge to ${contact['contact-email']}: ${err}`
                     : `Mail-merge sent to ${contact['contact-email']}`
                  );
               }
            );

         });

         res.send({messages});
      }
   };

   self.createRoutes = () => {
      /**
       * route to find and render the content of an email based on its id
       */
      self.route('post', 'html',
         requireUserMiddleware(self.getMailMergePermission()),
         requireBodyParamMiddleware('id', 'string'),
         self.routes.emailContent,
      );

      /**
       * route to find the individual contacts in a contact group
       */
      self.route('post', 'contact-group',
         requireUserMiddleware(self.getMailMergePermission()),
         requireBodyParamMiddleware('contact-group', 'string'),
         self.routes.contactGroup,
      );

      /**
       * route to create the emails for each user in the specified contact-group
       */
      self.route('post', 'mail-merge',
         requireUserMiddleware(self.getMailMergePermission()),
         self.routes.sendMailMerge,
      );
   };

};


function requireUserMiddleware (property = 'admin') {
   const defaultPermission = {
      admin: false,
      edit: false,
   };

   return function (req, res, next) {
      const user = req.user;
      const permissions = user && user._permissions || defaultPermission;
      const [prefix, suffix] = property.split('-');

      // admin (or edit if only requiring editors) permission globally
      if (permissions.admin || permissions[prefix]) {
         return setImmediate(next);
      }

      // admin (or edit if only requiring editors) of the named type
      if (permissions[property] || (suffix && permissions[`admin-${ suffix }`])) {
         return setImmediate(next);
      }

      res.status(401).send({ok: false});
   };
}

function requireBodyParamMiddleware (param = 'id', type = null) {
   return function (req, res, next) {
      if (!req.body || !(param in req.body)) {
         return res.status(400).send({ ok: false, err: `Missing parameter "${ id }"`});
      }

      if (type !== null && typeof req.body[param] !== type) {
         return res.status(400).send({ ok: false, err: `Invalid parameter type "${ id }" should be "${ type }"`});
      }

      next();
   };
}
