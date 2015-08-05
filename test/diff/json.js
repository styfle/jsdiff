import {diffJson, canonicalize} from '../../lib/diff/json';
import {convertChangesToXML} from '../../lib/convert/xml';

describe('diff/json', function() {
  describe('#diffJson', function() {
    it('should accept objects', function() {
      diffJson(
        {a: 123, b: 456, c: 789},
        {a: 123, b: 456}
      ).should.eql([
        { count: 3, value: '{\n  "a": 123,\n  "b": 456,\n' },
        { count: 1, value: '  "c": 789\n', added: undefined, removed: true },
        { count: 1, value: '}' }
      ]);
    });
    it('should accept objects with different order', function() {
      diffJson(
        {a: 123, b: 456, c: 789},
        {b: 456, a: 123}
      ).should.eql([
        { count: 3, value: '{\n  "a": 123,\n  "b": 456,\n' },
        { count: 1, value: '  "c": 789\n', added: undefined, removed: true },
        { count: 1, value: '}' }
      ]);
    });

    it('should accept objects with nested structures', function() {
      diffJson(
        {a: 123, b: 456, c: [1, 2, {foo: 'bar'}, 4]},
        {a: 123, b: 456, c: [1, {foo: 'bar'}, 4]}
      ).should.eql([
        { count: 5, value: '{\n  "a": 123,\n  "b": 456,\n  "c": [\n    1,\n' },
        { count: 1, value: '    2,\n', added: undefined, removed: true },
        { count: 6, value: '    {\n      "foo": "bar"\n    },\n    4\n  ]\n}' }
      ]);
    });

    it('should accept already stringified JSON', function() {
      diffJson(
        JSON.stringify({a: 123, b: 456, c: 789}, undefined, '  '),
        JSON.stringify({a: 123, b: 456}, undefined, '  ')
      ).should.eql([
        { count: 3, value: '{\n  "a": 123,\n  "b": 456,\n' },
        { count: 1, value: '  "c": 789\n', added: undefined, removed: true },
        { count: 1, value: '}' }
      ]);
    });

    it('should ignore trailing comma on the previous line when the property has been removed', function() {
      var diffResult = diffJson(
        {a: 123, b: 456, c: 789},
        {a: 123, b: 456});
      convertChangesToXML(diffResult).should.equal('{\n  &quot;a&quot;: 123,\n  &quot;b&quot;: 456,\n<del>  &quot;c&quot;: 789\n</del>}');
    });

    it('should ignore the missing trailing comma on the last line when a property has been added after it', function() {
      var diffResult = diffJson(
        {a: 123, b: 456},
        {a: 123, b: 456, c: 789});
      convertChangesToXML(diffResult).should.equal('{\n  &quot;a&quot;: 123,\n  &quot;b&quot;: 456,\n<ins>  &quot;c&quot;: 789\n</ins>}');
    });

    it('should throw an error if one of the objects being diffed has a circular reference', function() {
      var circular = {foo: 123};
      circular.bar = circular;
      (function() {
        diffJson(
          circular,
          {foo: 123, bar: {}}
        );
      }.should['throw']('Converting circular structure to JSON'));
    });
  });

  describe('#canonicalize', function() {
    it('should put the keys in canonical order', function() {
      getKeys(canonicalize({b: 456, a: 123})).should.eql(['a', 'b']);
    });

    it('should dive into nested objects', function() {
      var canonicalObj = canonicalize({b: 456, a: {d: 123, c: 456}});
      getKeys(canonicalObj.a).should.eql(['c', 'd']);
    });

    it('should dive into nested arrays', function() {
      var canonicalObj = canonicalize({b: 456, a: [789, {d: 123, c: 456}]});
      getKeys(canonicalObj.a[1]).should.eql(['c', 'd']);
    });

    it('should handle circular references correctly', function() {
      var obj = {b: 456};
      obj.a = obj;
      var canonicalObj = canonicalize(obj);
      getKeys(canonicalObj).should.eql(['a', 'b']);
      getKeys(canonicalObj.a).should.eql(['a', 'b']);
    });
  });
});

function getKeys(obj) {
  var keys = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      keys.push(key);
    }
  }
  return keys;
}
