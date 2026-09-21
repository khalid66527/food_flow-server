import { MongoClient, ObjectId } from 'mongodb';

const uri = 'mongodb+srv://food-delivery-platform:qF41pZNIqpFmA9HU@cluster0.xwtabrp.mongodb.net/food-delivery-platform?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('food-delivery-platform');

  const zones = await db.collection('zones').find({}).toArray();
  const zoneMap = new Map<number, ObjectId>();
  for (const z of zones) {
    zoneMap.set(Number(z.zoneId), z._id);
  }
  console.log('Zone map:', Array.from(zoneMap.entries()));

  const rest = await db.collection('restaurant').find({}).toArray();
  for (const r of rest) {
    const zid = Number(r.zoneId || r.numericZoneId || r.address?.zoneId);
    const zMongoId = zoneMap.get(zid);
    if (zMongoId) {
      await db.collection('restaurant').updateOne(
        { _id: r._id },
        {
          $set: {
            zoneId: zid,
            numericZoneId: zid,
            zoneMongoId: zMongoId,
            zoneMongoIdStr: zMongoId.toString(),
            'address.zoneId': zid,
          },
        }
      );
      console.log('Updated restaurant:', r.restaurantName || r.name, 'with zoneId:', zid, 'and zoneMongoId:', zMongoId.toString());
    }
  }

  // Also update foods
  const foods = await db.collection('foods').find({}).toArray();
  for (const f of foods) {
    const zid = Number(f.zoneId || f.numericZoneId);
    const zMongoId = zoneMap.get(zid);
    if (zMongoId) {
      await db.collection('foods').updateOne(
        { _id: f._id },
        {
          $set: {
            zoneId: zid,
            numericZoneId: zid,
            zoneMongoId: zMongoId,
            zoneMongoIdStr: zMongoId.toString(),
          },
        }
      );
    }
  }
  console.log('Updated', foods.length, 'foods successfully.');
  await client.close();
}

run().catch(console.error);
