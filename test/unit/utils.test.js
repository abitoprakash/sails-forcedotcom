const { expect } = require('chai');
const { SfDate } = require('jsforce');
const { parseClause, parseSortClause } = require('../../lib/utils');

const MOCK_COLLECTION = {
  definition: {
    name: {
      type: 'string',
      columnName: 'name'
    },
    age: {
      type: 'number',
      columnName: 'age'
    },
    createdDate: {
      type: 'ref',
      columnType: 'date',
      columnName: 'createdDate'
    },
    updatedAt: {
      type: 'ref',
      columnType: 'datetime',
      columnName: 'updatedAt'
    }
  }
};

describe('Utils', function () {
  describe('#parseSortClause()', function () {
    it('should correctly parse a sort clause with no operators', function () {
      const sortOptions = [{ name: 'ASC' }];
      const result = parseSortClause(sortOptions);
      expect(result).to.deep.equal({ name: 1 });
    });

    it('should correctly parse a sort clause with multiple operators', function () {
      const sortOptions = [{ name: 'ASC' }, { age: 'DESC' }];
      const result = parseSortClause(sortOptions);
      expect(result).to.deep.equal({ name: 1, age: -1 });
    });

    it('should correctly parse a sort clause with an empty array', function () {
      const sortOptions = [];
      const result = parseSortClause(sortOptions);
      expect(result).to.deep.equal({});
    });
  });

  describe('#parseClause()', function () {
    it('should correctly parse a clause with no operators', function () {
      const clause = { name: 'John Doe' };
      const result = parseClause(clause);
      expect(result).to.deep.equal({ name: 'John Doe' });
    });

    it('should correctly parse a clause with operators', function () {
      const clause = {
        and: [
          { name: { like: 'Jane Doe%' } },
          {
            age: {
              '>': 30
            }
          }
        ]
      };
      const result = parseClause(clause);
      expect(result).to.deep.equal({
        $and: [{ name: { $like: 'Jane Doe%' } }, { age: { $gt: 30 } }]
      });
    });

    it('should correctly parse a clause with nested operators', function () {
      const clause = {
        and: [{ name: 'John Doe' }, { or: [{ age: 30 }, { age: 31 }] }]
      };
      const result = parseClause(clause);
      expect(result).to.deep.equal({
        $and: [{ name: 'John Doe' }, { $or: [{ age: 30 }, { age: 31 }] }]
      });
    });

    it('should correctly parse a clause with date and datetime fields', function () {
      const clause = {
        createdDate: '2022-01-01',
        updatedAt: '2022-01-01T00:00:00.000Z'
      };

      const result = parseClause(clause, MOCK_COLLECTION);

      expect(result.createdDate).to.be.an.instanceOf(SfDate);
      expect(result.updatedAt).to.be.an.instanceOf(SfDate);
    });

    it('should correctly parse a clause with nested date and datetime fields', function () {
      const clause = {
        and: [
          { createdDate: '2022-01-01' },
          {
            or: [
              {
                updatedAt: {
                  '>=': '2022-01-01T00:00:00.000Z',
                  '<=': '2022-01-01T23:59:59.999Z'
                }
              },
              {
                updatedAt: {
                  '>=': '2022-01-01T00:00:00.000Z',
                  '<=': '2022-01-01T23:59:59.999Z'
                }
              }
            ]
          }
        ]
      };

      const result = parseClause(clause, MOCK_COLLECTION);

      expect(result.$and[0].createdDate).to.be.an.instanceOf(SfDate);
      expect(result.$and[1].$or[0].updatedAt.$gte).to.be.an.instanceOf(SfDate);
      expect(result.$and[1].$or[0].updatedAt.$lte).to.be.an.instanceOf(SfDate);
      expect(result.$and[1].$or[1].updatedAt.$gte).to.be.an.instanceOf(SfDate);
      expect(result.$and[1].$or[1].updatedAt.$lte).to.be.an.instanceOf(SfDate);
    });
  });
});
