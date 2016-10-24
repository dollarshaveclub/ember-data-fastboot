import Ember from 'ember';
import DS from 'ember-data';
import { initialize as fastbootInitialize } from 'dummy/instance-initializers/fastboot/ember-data-fastboot';
import { initialize as browserInitialize } from 'dummy/instance-initializers/browser/ember-data-fastboot';
import ShoeboxSerializer from 'dummy/serializers/-shoebox';
import { module, test } from 'qunit';
import destroyApp from '../../helpers/destroy-app';

module('instance-initializer:ember-data-fastboot', {
  beforeEach: function() {
    Ember.run(() => {
      this.application = Ember.Application.create();
      this.appInstance = this.application.buildInstance();
      this.appInstance.register('service:store', DS.Store);
      this.appInstance.register('service:fastboot', Ember.Service.extend({
        shoebox: Ember.Object.create({
          put(key, value) { this.set(key, value); },
          retrieve(key) { return this.get(key); }
        })
      }));
      this.appInstance.register('serializer:-shoebox', ShoeboxSerializer);
    });
  },
  afterEach: function() {
    Ember.run(this.appInstance, 'destroy');
    destroyApp(this.application);
  }
});

// Replace this with your real tests.
test('it works', function(assert) {
  fastbootInitialize(this.appInstance);
  browserInitialize(this.appInstance);

  // you would normally confirm the results of the initializer here
  assert.ok(true);
});
