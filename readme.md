
# @kwsites/cms-email

A set of modules for the [apostrophe cms](https://apostrophecms.org/) that simplifies the
handling of 'subscriber' pieces (people who sign up to receive notifications from you)
and 'email' pieces .

Configure the module with options:

- `emailHost` the host to connect to
- `emailPort` the port number on the remote SMTP host
- `transport` an optional object of properties to merge into the nodemailer transport configuration

By installing this module, you also have access to the bundled modules listed below:

## @kwsites/cms-subscriber

An extension of [apostrophe-pieces](https://docs.apostrophecms.org/apostrophe/modules/apostrophe-pieces) used to
capture registration and contact details for your subscribers.

## @kwsites/cms-subscriber-pages

Ensure you have added a `@kwsites/cms-subscriber-pages` type page to your website - this will
be the page used as the subscription management page in the emails that get sent out.

## @kwsites/cms-subscriber-widgets

Add a widget of type `@kwsites/cms-subscriber-widgets` to your website to capture user's names
and email addresses. Configure the widget with a 'Registration Source' to add the user to that
named group.

Using this widget requires that your project sets the following variables in less:

- @kwsites-button-border-color
- @kwsites-button-border-radius
- @kwsites-button-border-width
- @kwsites-button-enabled-color
- @kwsites-button-disabled-background
- @kwsites-button-disabled-color
- @kwsites-button-enabled-background
- @kwsites-enabled-input-color
- @kwsites-button-enabled-color
- @kwsites-input-margin


