import Ember from 'ember';
import DS from 'ember-data';
import { initialize as fastbootInitialize } from 'dummy/instance-initializers/fastboot/ember-data-fastboot';
import { initialize as browserInitialize } from 'dummy/instance-initializers/browser/ember-data-fastboot';
import ShoeboxSerializer from 'dummy/serializers/-shoebox';
import MovieModel from 'dummy/models/movie';
import PersonModel from 'dummy/models/person';
import ProductionCompanyModel from 'dummy/models/production-company';
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
  application.register('serializer:production-company', DS.RESTSerializer);
  application.register('transform:string', DS.StringTransform);
  application.register('transform:date', DS.DateTransform);
  application.register('service:fastboot', Ember.Service.extend({
    shoebox: sharedShoebox
  }));
  application.register('serializer:-shoebox', ShoeboxSerializer);
  application.register('model:movie', MovieModel);
  application.register('model:person', PersonModel);
  application.register('model:production-company', ProductionCompanyModel);
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
  const fastbootStore = this.fastbootAppInstance.lookup('service:store');

  Ember.run(() => {
    fastbootStore.pushPayload({
      data: {
        type: 'movie',
        id: 1,
        attributes: {
          title: 'Citizen Kane',
          'release-date': '1941-09-05T07:00:00.000Z'
        }
      }
    });

    fastbootInitialize(this.fastbootAppInstance);

    const shoebox = this.fastbootAppInstance.lookup('service:fastboot').get('shoebox');
    assert.equal(shoebox.get('ember-data-store.records.data.length'), 1, 'in fastboot adds record to shoebox');
    assert.equal(shoebox.get('ember-data-store.records.data')[0].attributes.title, 'Citizen Kane', 'in fastboot serializes title');
    assert.equal(shoebox.get('ember-data-store.records.data')[0].attributes['release-date'], '1941-09-05T07:00:00.000Z', 'in fastboot serializes date');

    browserInitialize(this.browserAppInstance);

    const browserStore = this.browserAppInstance.lookup('service:store');
    assert.equal(browserStore.peekAll('movie').get('length'), 1, 'in browser adds record to store');
    assert.equal(browserStore.peekAll('movie').get('firstObject.title'), 'Citizen Kane', 'in browser deserializes title');
    assert.deepEqual(browserStore.peekAll('movie').get('firstObject.releaseDate'), new Date('1941-09-05T07:00:00.000Z'), 'in browser deserializes date');
  });
});

test('when the store has a model with relationships', function(assert) {
  const fastbootStore = this.fastbootAppInstance.lookup('service:store');

  Ember.run(() => {
    fastbootStore.pushPayload({
      data: {
        type: 'movie',
        id: 1,
        attributes: {
          title: 'Citizen Kane',
          'release-date': '1941-09-05T07:00:00.000Z'
        },
        relationships: {
          director: {
            data: { type: 'person', id: 1 }
          },
          cast: {
            data: [
              { type: 'person', id: 1 },
              { type: 'person', id: 2 }
            ]
          }
        }
      },
      included: [{
        type: 'person',
        id: 1,
        attributes: {
          name: 'Orson Welles'
        }
      }, {
        type: 'person',
        id: 2,
        attributes: {
          name: 'Joseph Cotten'
        }
      }]
    });

    fastbootInitialize(this.fastbootAppInstance);

    const shoebox = this.fastbootAppInstance.lookup('service:fastboot').get('shoebox');
    assert.equal(shoebox.get('ember-data-store.records.data.length'), 3, 'in fastboot adds all records to shoebox');

    browserInitialize(this.browserAppInstance);

    const browserStore = this.browserAppInstance.lookup('service:store');
    const citizenKane = browserStore.peekAll('movie').get('firstObject');
    assert.equal(citizenKane.get('director.name'), 'Orson Welles', 'in browser deserializes belongsTo');
    assert.equal(citizenKane.get('cast.length'), 2, 'in browser deserializes hasMany');
  });
});

test('when a model uses the REST serializer', function(assert) {
  const fastbootStore = this.fastbootAppInstance.lookup('service:store');

  Ember.run(() => {
    fastbootStore.pushPayload({
      data: {
        type: 'movie',
        id: 1,
        attributes: {
          title: 'Citizen Kane',
          'release-date': '1941-09-05T07:00:00.000Z'
        }
      }
    });

    fastbootStore.pushPayload('production-company', {
      productionCompany: {
        id: 1,
        name: 'RKO Radio Pictures',
        movies: [ 1 ]
      }
    });

    fastbootInitialize(this.fastbootAppInstance);

    const shoebox = this.fastbootAppInstance.lookup('service:fastboot').get('shoebox');
    assert.equal(shoebox.get('ember-data-store.records.data.length'), 2, 'in fastboot adds all records to shoebox');
    const shoeboxRKO = shoebox.get('ember-data-store.records.data').filter(r => r.type === 'production-company')[0];
    assert.equal(shoeboxRKO.attributes.name, 'RKO Radio Pictures', 'in fastboot serializes name');
    const shoeboxCitizenKane = shoebox.get('ember-data-store.records.data').filter(r => r.type === 'movie')[0];
    assert.equal(shoeboxCitizenKane.attributes['release-date'], '1941-09-05T07:00:00.000Z', 'in fastboot serializes hasMany');

    browserInitialize(this.browserAppInstance);

    const browserStore = this.browserAppInstance.lookup('service:store');
    const rko = browserStore.peekRecord('production-company', 1);
    assert.equal(rko.get('name'), 'RKO Radio Pictures', 'in browser deserializes name');
    assert.deepEqual(rko.get('movies.firstObject.releaseDate'), new Date('1941-09-05T07:00:00.000Z'), 'in browser deserializes hasMany');
  });
});
