import Ember from 'ember';
import DS from 'ember-data';
import { initialize as fastbootInitialize } from 'dummy/instance-initializers/fastboot/ember-data-fastboot';
import { initialize as browserInitialize } from 'dummy/instance-initializers/browser/ember-data-fastboot';
import ShoeboxSerializer from 'dummy/serializers/-shoebox';
import MovieModel from 'dummy/models/movie';
import { module, test } from 'qunit';
import destroyApp from '../../helpers/destroy-app';

const sharedShoebox = Ember.Object.create({
  put(key, value) { this.set(key, value); },
  retrieve(key) { return this.get(key); }
});

function createApplication() {
  const application = Ember.Application.create();
  application.register('service:store', DS.Store);
  application.register('adapter:application', DS.JSONAPIAdapter);
  application.register('serializer:application', DS.JSONAPISerializer);
  application.register('transform:string', DS.StringTransform);
  application.register('transform:date', DS.DateTransform);
  application.register('service:fastboot', Ember.Service.extend({
    shoebox: sharedShoebox
  }));
  application.register('serializer:-shoebox', ShoeboxSerializer);
  application.register('model:movie', MovieModel);
  return application;
}

module('instance-initializer:ember-data-fastboot', {
  beforeEach: function() {
    Ember.run(() => {
      this.application = createApplication();
      this.fastbootAppInstance = this.application.buildInstance();
      this.browserAppInstance = this.application.buildInstance();
    });
  },
  afterEach: function() {
    Ember.run(this.fastbootAppInstance, 'destroy');
    Ember.run(this.browserAppInstance, 'destroy');
    destroyApp(this.application);
  }
});

test('when the store has a model', function(assert) {
  const done = assert.async();
  const fastbootStore = this.fastbootAppInstance.lookup('service:store');

  Ember.run(() => {
    fastbootStore.pushPayload({
      data: {
        type: 'movie',
        id: 1,
        attributes: {
          title: 'Citizen Kane',
          'release-date': new Date('09-05-1941').toJSON(),
        }
      }
    });

    Ember.run.next(() => {
      fastbootInitialize(this.fastbootAppInstance);

      const shoebox = this.fastbootAppInstance.lookup('service:fastboot').get('shoebox');
      assert.equal(shoebox.get('ember-data-store.records.data.length'), 1);
      assert.equal(shoebox.get('ember-data-store.records.data')[0].attributes.title, 'Citizen Kane');
      assert.equal(shoebox.get('ember-data-store.records.data')[0].attributes['release-date'], new Date('09-05-1941').toJSON());

      browserInitialize(this.browserAppInstance);

      const browserStore = this.browserAppInstance.lookup('service:store');
      assert.equal(browserStore.peekAll('movie').get('length'), 1);
      assert.equal(browserStore.peekAll('movie').get('firstObject.title'), 'Citizen Kane');
      assert.deepEqual(browserStore.peekAll('movie').get('firstObject.releaseDate'), new Date('09-05-1941'));

      done();
    });
  });
});
