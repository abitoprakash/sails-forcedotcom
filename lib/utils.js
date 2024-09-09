const _ = require('lodash');
const jsforce = require('jsforce');

// Map of operators to jsforce compatible operators
const OPERATOR_MAP = {
  and: '$and',
  or: '$or',
  like: '$like',
  in: '$in',
  '!=': '$ne',
  '>=': '$gte',
  '>': '$gt',
  '<=': '$lte',
  '<': '$lt'
};

/**
 * This function will parse the where clause to jsforce compatible format.
 * It will also apply formatters to the data based on the type of the field.
 * 
 * @param {*} original 
 * @param {object} collection 
 * @returns {*} parsed clause
 */
function parseClause(original, collection) {
  const formatters = getDataFormatters(collection);

  const parse = (obj) => {
    if (_.isPlainObject(obj)) {
      return _.transform(obj, (result, value, key) => {
          const newKey = OPERATOR_MAP[key] || key;

          if (formatters[newKey]) {
            if (typeof value === 'string') {
              result[newKey] = formatters[newKey](value);
            } else if (_.isPlainObject(value)) {
              result[newKey] = _.transform(value, (acc, val, k) => {
                acc[OPERATOR_MAP[k] || k] = formatters[newKey](val);
              }, {});
            }
          } else {
            result[newKey] = parse(value);
          }
        },
        {}
      );
    }
    return _.isArray(obj) ? obj.map(parse) : obj;
  };

  return parse(original);
}

// This will convert sort by clause into jsforce format.
// Since the new format of sails v1 is not compatible with jsforce
function parseSortClause(sortOptions) {
  var convertedSortClause = {},
    sortKeyMap = {
      ASC: 1,
      DESC: -1
    };
  if (!sortOptions.length) {
    return {};
  }
  sortOptions.forEach(function (item) {
    _.extend(convertedSortClause, item);
  });
  return _.mapValues(convertedSortClause, function (sortOrder) {
    return sortKeyMap[sortOrder];
  });
}

/**
 * This function will return the formatters based on the type of the field
 * @param {object} collectionDef 
 * @returns {object} formatters
 */
function getDataFormatters(collectionDef) {
  const attributes =
    collectionDef && _.isPlainObject(collectionDef.definition)
      ? collectionDef.definition
      : {};

  return Object.entries(attributes).reduce((acc, [key, value]) => {
    const columnType = _.get(
      value,
      'autoMigrations.columnType',
      value.columnType || value.type
    );
    const field = value.columnName || key;

    // Add formatters here based on type
    if (columnType === 'datetime') {
      acc[field] = jsforce.SfDate.toDateTimeLiteral;
    } else if (columnType === 'date') {
      acc[field] = jsforce.SfDate.toDateLiteral;
    }

    return acc;
  }, {});
}

module.exports = {
  parseClause,
  parseSortClause
};
