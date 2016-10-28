import DS from 'ember-data';

export default DS.Model.extend({

  title: DS.attr('string'),
  releaseDate: DS.attr('date'),
  director: DS.belongsTo('person'),
  cast: DS.hasMany('person')

});
