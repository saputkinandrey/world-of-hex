db.getCollection('events-collection')
  .find({ aggregateRootId: '69dcd1244fb7f1014bb10d61' })
  .sort({ aggregateRootVersion: 1 })
  .toArray()
