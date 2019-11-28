const _ = require('lodash');

module.exports = (self, options) => {

   self.pushAssets = _.wrap(self.pushAssets, (fn) => {
      fn();
      self.pushAsset('stylesheet', 'always', {when: 'always'});
   });

};
