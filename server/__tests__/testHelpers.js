import { ObjectId } from "mongodb";

export class FakeCursor {
  constructor(docs) {
    this.docs = [...docs];
  }

  sort(sortSpec) {
    const [[field, direction]] = Object.entries(sortSpec);
    this.docs.sort((left, right) => {
      const leftValue = left[field] instanceof Date ? left[field].getTime() : left[field];
      const rightValue = right[field] instanceof Date ? right[field].getTime() : right[field];
      if (leftValue === rightValue) return 0;
      return leftValue > rightValue ? direction : -direction;
    });
    return this;
  }

  limit(count) {
    this.docs = this.docs.slice(0, count);
    return this;
  }

  async toArray() {
    return this.docs;
  }
}

export class FakeCollection {
  constructor(docs = []) {
    this.docs = docs;
  }

  async findOne(filter) {
    return this.docs.find((doc) => matchesFilter(doc, filter)) || null;
  }

  find(filter = {}) {
    return new FakeCursor(this.docs.filter((doc) => matchesFilter(doc, filter)));
  }

  async insertOne(doc) {
    const insertedId = doc._id || new ObjectId();
    this.docs.push({ ...doc, _id: insertedId });
    return { insertedId };
  }

  async updateOne(filter, update) {
    const doc = this.docs.find((item) => matchesFilter(item, filter));
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    Object.assign(doc, update.$set || {});
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async countDocuments(filter = {}) {
    return this.docs.filter((doc) => matchesFilter(doc, filter)).length;
  }
}

function getValue(doc, key) {
  return key.split(".").reduce((value, part) => value?.[part], doc);
}

function valuesEqual(left, right) {
  if (left instanceof ObjectId || right instanceof ObjectId) return left?.toString() === right?.toString();
  return left === right;
}

export function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    const actual = getValue(doc, key);
    if (expected && typeof expected === "object" && "$in" in expected) {
      return expected.$in.some((value) => valuesEqual(actual, value));
    }
    if (expected && typeof expected === "object" && "$ne" in expected) {
      return !valuesEqual(actual, expected.$ne);
    }
    if (expected && typeof expected === "object" && "$gt" in expected) {
      return actual > expected.$gt;
    }
    if (expected && typeof expected === "object" && "$regex" in expected) {
      const flags = expected.$options || "";
      return new RegExp(expected.$regex, flags).test(actual);
    }
    return valuesEqual(actual, expected);
  });
}

export function createFakeDb(collections) {
  const collectionMap = new Map(
    Object.entries(collections).map(([name, docs]) => [name, new FakeCollection(docs)])
  );

  return {
    collection(name) {
      if (!collectionMap.has(name)) collectionMap.set(name, new FakeCollection());
      return collectionMap.get(name);
    }
  };
}
