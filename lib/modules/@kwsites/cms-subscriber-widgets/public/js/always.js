(function (apos) {

   apos.define('@kwsites/cms-subscriber-widgets', {

      extend: 'apostrophe-widgets',

      construct: function (self, options) {

         jQuery(document).find('form.subscriber-form').each(enableSubscriberForm);

         function enableSubscriberForm (index, form) {

            var $form = jQuery(form).on('submit', function (e) {
               e.preventDefault();

               if (!isFormValid()) {
                  return;
               }

               var piece = _.cloneDeep(self.options.piece);
               $form.find('input[name]').each(function (index, input) {
                  if (piece.hasOwnProperty(input.name)) {
                     piece[input.name] = jQuery(input).val();
                  }
               });

               piece['list-source'] = $form.attr('data-list-source') || '';

               self.api('submit', piece, function (data) {
                  callback(data.status === 'ok' ? null : 'error');
               }, function (err) {
                  // Transport-level error
                  return callback(err);
               })
            });

            var $button = $form.find('button');

            $form.find('input[name]')
               .on('change keyup', setFormValidationState)
               .on('focus', function () {
                  var timer = setInterval(setFormValidationState, 50);
                  jQuery(this).one('blur', function () {
                     clearInterval(timer);
                  });
               });

            setFormValidationState();

            function callback (err) {
               $form.addClass('form-success');
               apos.emit('form-success');
               apos.emit('app.track', {
                  name: 'sign_up',
                  params: {
                     method: $form.attr('data-track-method') || 'unknown'
                  }
               });


               var successClassTimeout = $form.attr('data-temporary-success');
               if (successClassTimeout) {
                  setTimeout(function () {
                     $form.removeClass('form-success')[0].reset();
                     setFormValidationState();
                  }, parseInt(successClassTimeout, 10));
               }
            }

            function isFormValid () {
               var valid = true;

               var elements = $form.find('input').each(function (index, input) {
                  var inputValid = false;

                  if (typeof input.validity === 'boolean') {
                     inputValid = input.validity;
                  }
                  else if (input.type === 'email') {
                     inputValid = input.value && input.value.split('@').length === 2;
                  }
                  else {
                     inputValid = !!input.value;
                  }

                  valid = valid && inputValid;

                  jQuery(input).toggleClass('dirty', !!input.value);
               });

               if (!elements.length) {
                  valid = false;
               }

               return valid;
            }

            function setFormValidationState () {
               $form.find('input[name]').each(function (index, input) {
                  jQuery(input).toggleClass('dirty', !!input.value);
               });

               var formValid = isFormValid();
               $button.prop('disabled', !formValid);

               $button.attr('title', $button.data(formValid ? 'enabledTitle' : 'disabledTitle') || '');
            }

         }
      }
   });

}(window.apos));
