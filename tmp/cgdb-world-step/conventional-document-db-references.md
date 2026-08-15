# Conventional document-database benchmark references

These references are context for the CGDB world-step benchmark, not performance targets. None of
them measures a local immutable Git snapshot, the same document sizes, the same graph traversal,
or the same sequential Reader implementation. Do not convert their throughput or tail latency into
a CGDB step duration.

## Closest published methodologies

| Reference | Read workload | Published result | Why it is not directly comparable |
| --- | --- | --- | --- |
| [MongoDB DriverBench specification](https://specifications.readthedocs.io/en/latest/benchmarking/benchmarking/) | `Find one by ID` performs 10,000 sequential indexed reads of a 1,622-byte JSON document. `Find many and empty the cursor` retrieves 10,000 copies of the same document with one empty-filter cursor. | The specification defines the dataset, iteration rules, wall-clock measurement, median score, and diagnostic percentiles; it does not define a universal latency result. | It is the closest operation-count and full-load methodology, but its 16.22 MB corpus is about twenty times smaller than 10,000 32 KiB actor memories, and it includes a database server and driver. |
| [Performance Evaluation of NoSQL Document Databases](https://doi.org/10.3390/a16020078), Algorithms 16(2), 2023 | YCSB Workload C, 100% reads with a Zipfian request distribution, three client threads, 10 KB records, and 100,000 / 1,000,000 / 10,000,000-record datasets. | For Workload C the reported runtimes were Couchbase 6.72 / 80.34 / 3,423.30 s, CouchDB 17.20 / 145.05 / 4,150.06 s, and MongoDB 6.61 / 111.58 / 2,305.59 s. The test host was a Ryzen 5 4500U laptop with 15.4 GB RAM and an SSD. | This is an independent numerical comparison, but even its smallest corpus is about 1 GB and it uses three clients, server databases, and a Zipfian access pattern. Runtime is for the YCSB workload, not one world step. |
| [MongoDB cache/disk YCSB study](https://www.mongodb.com/company/blog/through-the-looking-glass-analyzing-the-interplay-between-memory-disk-and-read-performance) | Uniform read-only YCSB; each operation is an `_id` lookup; 16 threads; MongoDB 3.4.10, YCSB 0.14, and the MongoDB 3.6 driver. | A 2.43 GB working set fully served by WiredTiger cache reached 76,113 ops/s with p99 0.40-0.44 ms. A 3.66 GB set served mostly by filesystem cache reached 66,720 ops/s with p99 0.53-0.55 ms. At 4.8 GB with physical I/O, p99 rose to 19 / 171 / 770 ms under the three disk scenarios. | This usefully demonstrates the cache cliff, but it is an old, concurrent, server-and-driver benchmark. The source explicitly says synthetic results do not map directly to production performance. |
| [Azure Cosmos DB YCSB framework example](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/benchmarking-framework) | Managed-service read recipe at 400 RU/s, 180,000 reads. | 299 ops/s; minimum 706 us, mean 1,079 us, maximum 448,255 us, and p99 2,867 us in the published example output. | The result includes a network service and provisioned-throughput throttling. It is useful as a reporting example, not a local Reader baseline. |

## Consequences for CGDB reporting

- Keep `snapshot-cold` and `snapshot-hot` results separate and state what was warmed.
- Publish exact document counts, source bytes, unique actors, physical blob reads, cache hits and
  misses, RSS, and whole-step wall-clock timings.
- Treat sampled JSON-query projections as projections. Preserve the raw per-actor batch samples,
  confidence interval, and temporal-drift check beside the point estimate.
- Compare future alternative storage engines on the same generated fixture and machine. External
  database numbers remain context only.
