import { expect } from "earl";
import * as soia from "./soia";
import { SerializerTester } from "./testing";
import { describe, it } from "mocha";

describe("Timestamp", () => {
  it("#MIN is min timestamp rerpresentable as Date objects", () => {
    expect(new Date(soia.Timestamp.MIN.unixMillis).getTime()).toEqual(
      -8640000000000000,
    );
    expect(new Date(soia.Timestamp.MIN.unixMillis - 1).getTime()).toEqual(
      Number.NaN,
    );
  });

  it("#MAX is max timestamp rerpresentable as Date objects", () => {
    expect(new Date(soia.Timestamp.MAX.unixMillis).getTime()).toEqual(
      8640000000000000,
    );
    expect(new Date(soia.Timestamp.MAX.unixMillis + 1).getTime()).toEqual(
      Number.NaN,
    );
  });

  describe("#fromUnixMillis()", () => {
    it("works", () => {
      expect(soia.Timestamp.fromUnixMillis(3000).unixMillis).toEqual(3000);
      expect(soia.Timestamp.fromUnixMillis(3001).unixSeconds).toEqual(3.001);
    });
    it("clamp timestamps outside of valid range", () => {
      expect(
        soia.Timestamp.fromUnixMillis(soia.Timestamp.MAX.unixMillis + 1)
          .unixMillis,
      ).toEqual(
        soia.Timestamp.MAX.unixMillis,
      );
    });
    it("truncates to millisecond precision", () => {
      expect(soia.Timestamp.fromUnixMillis(2.8).unixMillis).toEqual(3);
    });
  });

  describe("#fromUnixSeconds()", () => {
    it("works", () => {
      expect(soia.Timestamp.fromUnixSeconds(3).unixMillis).toEqual(3000);
      expect(soia.Timestamp.fromUnixSeconds(3).unixSeconds).toEqual(3);
    });
    it("truncates to millisecond precision", () => {
      expect(soia.Timestamp.fromUnixSeconds(2.0061).unixSeconds).toEqual(2.006);
    });
  });

  describe("#toDate()", () => {
    it("works", () => {
      expect(soia.Timestamp.fromUnixMillis(1694467279837).toDate().getTime())
        .toEqual(1694467279837);
    });
  });

  describe("#now()", () => {
    it("works", () => {
      const now = soia.Timestamp.now();
      expect(now.toDate().getFullYear()).toBeGreaterThan(2022);
      expect(now.toDate().getFullYear()).toBeLessThan(
        new Date().getFullYear() + 2,
      );
    });
  });

  describe("#toString()", () => {
    it("works", () => {
      const timestamp = soia.Timestamp.fromUnixMillis(1694467279837);
      expect(timestamp.toString()).toEqual("2023-09-11T21:21:19.837Z");
    });
  });

  describe("#parse()", () => {
    it("works", () => {
      const timestamp = soia.Timestamp.fromUnixMillis(1694467279837);
      const parseResult = soia.Timestamp.parse(timestamp.toString());
      expect(parseResult.unixMillis).toEqual(timestamp.unixMillis);
    });
  });
});

describe("timestamp serializer", () => {
  const serializer = soia.primitiveSerializer("tsmillis");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toHaveSubset({
      kind: "primitive",
      primitive: "tsmillis",
      serializer: serializer,
    });
  });

  tester.reserializeAndAssert(
    soia.Timestamp.UNIX_EPOCH,
    {
      denseJson: 0,
      readableJson: "1970-01-01T00:00:00.000Z",
      binaryFormBase16: "00",
    },
    "reserialize Unix EPOCH",
  );

  tester.reserializeAndAssert(
    soia.Timestamp.fromUnixMillis(1692999034586),
    {
      denseJson: 1692999034586,
      readableJson: "2023-08-25T21:30:34.586Z",
      binaryFormBase16: "efda269b2e8a010000",
    },
    "reserialize normal timestamp",
  );

  tester.reserializeAndAssert(
    soia.Timestamp.fromUnixMillis(-1692999034586),
    {
      denseJson: -1692999034586,
      readableJson: "1916-05-09T02:29:25.414Z",
      binaryFormBase16: "ef26d964d175feffff",
    },
    "reserialize negative timestamp",
  );

  it("default JSON flavor is dense", () => {
    expect(serializer.toJson(soia.Timestamp.UNIX_EPOCH)).toEqual(0);
  });
});

describe("ByteString", () => {
  // TODO: test all innstance methods on both a slice and a non-slice

  const makeTestByteArray = (length = 4, start = 0) => {
    const array: number[] = [];
    for (let i = 0; i < length; ++i) {
      array[i] = start + i;
    }
    return new Uint8Array(array);
  };

  const makeTestByteString = (length = 4, start = 0) => {
    return soia.ByteString.sliceOf(makeTestByteArray(length, start).buffer);
  };

  const makeSlicedTestByteString = (length = 4) => {
    const superByteString = makeTestByteString(length + 2, -1);
    return soia.ByteString.sliceOf(superByteString, 1, length + 1);
  };

  const toArray = (byteString: soia.ByteString) => {
    return Array.from(new Uint8Array(byteString.toBuffer()));
  };

  describe("#EMPTY", () => {
    it("works", () => {
      expect(soia.ByteString.EMPTY.byteLength).toEqual(0);
      expect(soia.ByteString.EMPTY.toBuffer().byteLength).toEqual(0);
    });
  });

  describe("#sliceOf", () => {
    it("works when no start/end is specified", () => {
      let byteString = makeTestByteString();
      byteString = soia.ByteString.sliceOf(byteString);
      expect(byteString.byteLength).toEqual(4);
      expect(toArray(byteString)).toEqual([0, 1, 2, 3]);
    });

    it("works when only start is specified", () => {
      let byteString = makeTestByteString();
      byteString = soia.ByteString.sliceOf(byteString, 1);
      expect(byteString.byteLength).toEqual(3);
      expect(toArray(byteString)).toEqual([1, 2, 3]);
    });

    it("works when both start/end are specified", () => {
      let byteString = makeTestByteString();
      byteString = soia.ByteString.sliceOf(byteString, 1, 3);
      expect(byteString.byteLength).toEqual(2);
      expect(toArray(byteString)).toEqual([1, 2]);
    });

    it("copies ArrayBuffer slice", () => {
      const byteString = makeTestByteString();
      expect(byteString.byteLength).toEqual(4);
      expect(toArray(byteString)).toEqual([0, 1, 2, 3]);
    });

    it("returns empty when start === end", () => {
      const byteString = makeTestByteString();
      expect(soia.ByteString.sliceOf(byteString, 3, 3)).toExactlyEqual(
        soia.ByteString.EMPTY,
      );
    });

    it("returns empty when start > end", () => {
      const byteString = makeTestByteString();
      expect(soia.ByteString.sliceOf(byteString, 3, 0)).toExactlyEqual(
        soia.ByteString.EMPTY,
      );
    });

    it("doesn't copy ByteString if it doesn't need to", () => {
      const byteString = makeTestByteString();
      expect(soia.ByteString.sliceOf(byteString, 0, 4)).toExactlyEqual(
        byteString,
      );
    });

    it("start can be < 0", () => {
      const byteString = makeTestByteString();
      expect(soia.ByteString.sliceOf(byteString, -1, 4)).toExactlyEqual(
        byteString,
      );
    });

    it("end can be > byteLength", () => {
      const byteString = makeTestByteString();
      expect(soia.ByteString.sliceOf(byteString, 0, 5)).toExactlyEqual(
        byteString,
      );
    });

    it("copies bytes in the ArrayBuffer", () => {
      const array = makeTestByteArray();
      const byteString = soia.ByteString.sliceOf(array.buffer);
      array[3] = 4;
      expect(toArray(byteString)).toEqual([0, 1, 2, 3]);
    });
  });

  for (const sliced of [false, true]) {
    const description = sliced ? "on sliced instance" : "on normal instance";
    const byteString = //
      sliced ? makeSlicedTestByteString(20) : makeTestByteString(20);
    describe(description, () => {
      describe("#byteLength", () => {
        it("works", () => {
          expect(byteString.byteLength).toEqual(20);
        });
      });

      describe("#toBuffer", () => {
        it("works", () => {
          const buffer = byteString.toBuffer();
          expect(buffer.byteLength).toEqual(20);
          expect(new Uint8Array(buffer).at(2)).toEqual(2);
        });
      });

      describe("#copyTo", () => {
        it("works", () => {
          const buffer = new ArrayBuffer(22);
          byteString.copyTo(buffer, 1);
          const array = new Uint8Array(buffer);
          expect(array[5]).toEqual(4);
        });
      });

      describe("#at()", () => {
        it("works with normal index", () => {
          expect(byteString.at(2)).toEqual(2);
        });

        it("works with negative index", () => {
          expect(byteString.at(-1)).toEqual(19);
        });
      });

      describe("base64", () => {
        const base64 = byteString.toBase64();
        it("#toBase64() works", () => {
          expect(base64).toEqual("AAECAwQFBgcICQoLDA0ODxAREhM=");
        });
        const fromBase64 = soia.ByteString.fromBase64(base64);
        it("#fromBase64() works", () => {
          expect(toArray(fromBase64)).toEqual(toArray(byteString));
        });
      });

      describe("base16", () => {
        const array = toArray(byteString);
        const base16 = byteString.toBase16();
        it("#toBase16() works", () => {
          expect(base16).toEqual("000102030405060708090a0b0c0d0e0f10111213");
        });
        it("#fromBase16() works", () => {
          const fromBase64 = soia.ByteString.fromBase16(base16);
          expect(toArray(fromBase64)).toEqual(array);
        });
        it("#fromBase16() accepts uppercase", () => {
          const fromBase64 = soia.ByteString.fromBase16(base16.toUpperCase());
          expect(toArray(fromBase64)).toEqual(array);
        });
      });
    });
  }
});

describe("bool serializer", () => {
  const serializer = soia.primitiveSerializer("bool");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toHaveSubset({
      kind: "primitive",
      primitive: "bool",
      serializer: serializer,
    });
  });

  tester.reserializeAndAssert(true, {
    denseJson: true,
    binaryFormBase16: "01",
  });
  tester.reserializeAndAssert(false, {
    denseJson: false,
    binaryFormBase16: "00",
  });
  tester.deserializeZeroAndAssert((input) => input === false);
});

describe("int32 serializer", () => {
  const serializer = soia.primitiveSerializer("int32");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toHaveSubset({
      kind: "primitive",
      primitive: "int32",
      serializer: serializer,
    });
  });

  tester.reserializeAndAssert(2, {
    denseJson: 2,
    binaryFormBase16: "02",
  });
  tester.reserializeAndAssert(0, {
    denseJson: 0,
    binaryFormBase16: "00",
  });
  tester.reserializeAndAssert(-1, {
    denseJson: -1,
    binaryFormBase16: "ebff",
  });
  tester.reserializeAndAssert(2.8, {
    denseJson: 2,
    binaryFormBase16: "02",
  });
  tester.reserializeAndAssert(-3.8, {
    denseJson: -3,
    binaryFormBase16: "ebfc",
  });
  tester.reserializeAndAssert(231, {
    denseJson: 231,
    binaryFormBase16: "e7",
  });
  tester.reserializeAndAssert(232, {
    denseJson: 232,
    binaryFormBase16: "e8e800",
  });
  tester.reserializeAndAssert(65535, {
    denseJson: 65535,
    binaryFormBase16: "e8ffff",
  });
  tester.reserializeAndAssert(65536, {
    denseJson: 65536,
    binaryFormBase16: "e900000100",
  });
  tester.reserializeAndAssert(2147483647, {
    denseJson: 2147483647,
    binaryFormBase16: "e9ffffff7f",
  });
  tester.reserializeAndAssert(-255, {
    denseJson: -255,
    binaryFormBase16: "eb01",
  });
  tester.reserializeAndAssert(-256, {
    denseJson: -256,
    binaryFormBase16: "eb00",
  });
  tester.reserializeAndAssert(-257, {
    denseJson: -257,
    binaryFormBase16: "ecfffe",
  });
  tester.reserializeAndAssert(-65536, {
    denseJson: -65536,
    binaryFormBase16: "ec0000",
  });
  tester.reserializeAndAssert(-65537, {
    denseJson: -65537,
    binaryFormBase16: "edfffffeff",
  });
  tester.reserializeAndAssert(-2147483648, {
    denseJson: -2147483648,
    binaryFormBase16: "ed00000080",
  });

  it("accepts string", () => {
    expect(serializer.fromJson("0")).toEqual(0);
  });

  it("transforms to integer", () => {
    expect(serializer.fromJson("2.3")).toEqual(2);
  });

  it("accepts NaN", () => {
    expect(serializer.fromJson("NaN")).toEqual(0);
  });

  it("accepts Infinity", () => {
    expect(serializer.fromJson("Infinity")).toEqual(0);
  });

  it("accepts -Infinity", () => {
    expect(serializer.fromJson("-Infinity")).toEqual(0);
  });

  it("accepts numbers out of int32 range", () => {
    expect(serializer.fromJson(2147483648)).toEqual(-2147483648);
    expect(serializer.fromJson(-2147483649)).toEqual(2147483647);
    expect(
      serializer.fromBinaryForm(
        soia.primitiveSerializer("int64").toBinaryForm(BigInt(2147483648))
          .toBuffer(),
      ),
    ).toEqual(-2147483648);
  });

  it("accepts booleans", () => {
    expect(serializer.fromJson(false)).toEqual(0);
    expect(serializer.fromJson(true)).toEqual(1);
  });
});

describe("int64 serializer", () => {
  const serializer = soia.primitiveSerializer("int64");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toHaveSubset({
      kind: "primitive",
      primitive: "int64",
      serializer: serializer,
    });
  });

  tester.reserializeAndAssert(BigInt("888888888888"), {
    denseJson: "888888888888",
    binaryFormBase16: "ee380ee8f5ce000000",
  });
  // Numbers outside of bounds are clamped.
  tester.reserializeAndAssert(BigInt("9223372036854775808"), {
    denseJson: "9223372036854775807",
    binaryFormBase16: "eeffffffffffffff7f",
  });
  tester.reserializeAndAssert(BigInt("-9223372036854775809"), {
    denseJson: "-9223372036854775808",
    binaryFormBase16: "ee0000000000000080",
  });
  tester.reserializeAndAssert(BigInt("0"), {
    denseJson: "0",
    binaryFormBase16: "00",
  });
  tester.deserializeZeroAndAssert((i) =>
    typeof i === "bigint" && Number(i) === 0
  );
  it("accepts number", () => {
    expect(serializer.fromJson(123)).toEqual(BigInt(123));
  });
  it("accepts number outside of range", () => {
    expect(serializer.fromJson("-99999999999999999999999999")).toEqual(
      BigInt("-99999999999999999999999999"),
    );
  });
});

describe("uint64 serializer", () => {
  const serializer = soia.primitiveSerializer("uint64");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toHaveSubset({
      kind: "primitive",
      primitive: "uint64",
      serializer: serializer,
    });
  });

  tester.reserializeAndAssert(BigInt("888888888888"), {
    denseJson: "888888888888",
    binaryFormBase16: "ea380ee8f5ce000000",
  });
  // Numbers outside of bounds are clamped.
  tester.reserializeAndAssert(BigInt("18446744073709551616"), {
    denseJson: "18446744073709551615",
    binaryFormBase16: "eaffffffffffffffff",
  });
  tester.reserializeAndAssert(BigInt("-1"), {
    denseJson: "0",
    binaryFormBase16: "00",
  });
  tester.reserializeAndAssert(BigInt("0"), {
    denseJson: "0",
    binaryFormBase16: "00",
  });
  tester.deserializeZeroAndAssert((i) =>
    typeof i === "bigint" && Number(i) === 0
  );
  it("accepts number", () => {
    expect(serializer.fromJson(123)).toEqual(BigInt(123));
  });
  it("accepts number outside of range", () => {
    expect(serializer.fromJson("-99999999999999999999999999")).toEqual(
      BigInt("-99999999999999999999999999"),
    );
  });
});

describe("float32 serializer", () => {
  const serializer = soia.primitiveSerializer("float32");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toHaveSubset({
      kind: "primitive",
      primitive: "float32",
      serializer: serializer,
    });
  });

  tester.reserializeAndAssert(2, {
    denseJson: 2,
    binaryFormBase16: "f000000040",
  });
  tester.reserializeAndAssert(0, {
    denseJson: 0,
    binaryFormBase16: "00",
  });
  tester.reserializeAndAssert(-1, {
    denseJson: -1,
    binaryFormBase16: "f0000080bf",
  });
  tester.reserializeAndAssert(2.8, {
    denseJson: 2.8,
    binaryFormBase16: "f033333340",
  });
  tester.reserializeAndAssert(-3.8, {
    denseJson: -3.8,
    binaryFormBase16: "f0333373c0",
  });
  tester.reserializeAndAssert(Number.NaN, {
    denseJson: "NaN",
    binaryFormBase16: "f00000c07f",
  });
  tester.reserializeAndAssert(Number.POSITIVE_INFINITY, {
    denseJson: "Infinity",
    binaryFormBase16: "f00000807f",
  });
  tester.reserializeAndAssert(Number.NEGATIVE_INFINITY, {
    denseJson: "-Infinity",
    binaryFormBase16: "f0000080ff",
  });
  it("accepts string", () => {
    expect(serializer.fromJson("0")).toEqual(0);
    expect(serializer.fromJson("2.5")).toEqual(2.5);
  });
});

describe("float64 serializer", () => {
  const serializer = soia.primitiveSerializer("float64");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toHaveSubset({
      kind: "primitive",
      primitive: "float64",
      serializer: serializer,
    });
  });

  tester.reserializeAndAssert(2, {
    denseJson: 2,
    binaryFormBase16: "f10000000000000040",
  });
  tester.reserializeAndAssert(0, {
    denseJson: 0,
    binaryFormBase16: "00",
  });
  tester.reserializeAndAssert(-1, {
    denseJson: -1,
    binaryFormBase16: "f1000000000000f0bf",
  });
  tester.reserializeAndAssert(2.8, {
    denseJson: 2.8,
    binaryFormBase16: "f16666666666660640",
  });
  tester.reserializeAndAssert(-3.8, {
    denseJson: -3.8,
    binaryFormBase16: "f16666666666660ec0",
  });
  tester.reserializeAndAssert(Number.NaN, {
    denseJson: "NaN",
    binaryFormBase16: "f1000000000000f87f",
  });
  tester.reserializeAndAssert(Number.POSITIVE_INFINITY, {
    denseJson: "Infinity",
    binaryFormBase16: "f1000000000000f07f",
  });
  tester.reserializeAndAssert(Number.NEGATIVE_INFINITY, {
    denseJson: "-Infinity",
    binaryFormBase16: "f1000000000000f0ff",
  });
  it("accepts string", () => {
    expect(serializer.fromJson("0")).toEqual(0);
    expect(serializer.fromJson("2.5")).toEqual(2.5);
  });
});

describe("string serializer", () => {
  const serializer = soia.primitiveSerializer("string");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toHaveSubset({
      kind: "primitive",
      primitive: "string",
      serializer: serializer,
    });
  });

  tester.reserializeAndAssert("", {
    denseJson: "",
    binaryFormBase16: "f2",
  });
  tester.reserializeAndAssert("Foôbar", {
    denseJson: "Foôbar",
    binaryFormBase16: "f307466fc3b4626172",
  });
  tester.reserializeAndAssert('Foo\n"bar"', {
    denseJson: 'Foo\n"bar"',
    binaryFormBase16: "f309466f6f0a2262617222",
  });
  tester.reserializeAndAssert("é".repeat(5000), {
    denseJson: "é".repeat(5000),
    binaryFormBase16: `f3e81027${"c3a9".repeat(5000)}`,
  },
  'reserialize "é".repeat(5000)');
  // See https://stackoverflow.com/questions/55056322/maximum-utf-8-string-size-given-utf-16-size
  tester.reserializeAndAssert("\uFFFF".repeat(5000), {
    denseJson: "\uFFFF".repeat(5000),
    binaryFormBase16: `f3e8983a${"efbfbf".repeat(5000)}`,
  },
  'reserialize "\\uFFFF".repeat(5000)');
  tester.deserializeZeroAndAssert((s) => s === "");
});

describe("bytes serializer", () => {
  const serializer = soia.primitiveSerializer("bytes");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toHaveSubset({
      kind: "primitive",
      primitive: "bytes",
      serializer: serializer,
    });
  });

  tester.reserializeAndAssert(soia.ByteString.fromBase64("abc123"), {
    denseJson: "abc12w==",
    binaryFormBase16: "f50469b735db",
  });
  tester.reserializeAndAssert(soia.ByteString.EMPTY, {
    denseJson: "",
    binaryFormBase16: "f4",
  });
  tester.deserializeZeroAndAssert((s) => s.byteLength === 0);
});

describe("nullable serializer", () => {
  const otherSerializer = soia.primitiveSerializer("int32");
  const serializer = soia.nullableSerializer(otherSerializer);
  it("is idempotent", () => {
    expect(soia.nullableSerializer(serializer)).toExactlyEqual(serializer);
  });

  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toHaveSubset({
      kind: "nullable",
      otherType: otherSerializer.typeDescriptor,
      serializer: serializer,
    });
  });

  tester.reserializeAndAssert(2, {
    denseJson: 2,
    binaryFormBase16: "02",
  });
  tester.reserializeAndAssert(null, {
    denseJson: null,
    binaryFormBase16: "ff",
  });
  tester.deserializeZeroAndAssert((i) => i === 0);
});

describe("array serializer", () => {
  const itemSerializer = soia.primitiveSerializer("int32");
  const serializer = soia.arraySerializer(itemSerializer);
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toHaveSubset({
      kind: "array",
      itemType: itemSerializer.typeDescriptor,
      serializer: serializer,
    });
  });

  tester.reserializeAndAssert([], {
    denseJson: [],
    binaryFormBase16: "f6",
  });

  tester.reserializeAndAssert([10], {
    denseJson: [10],
    binaryFormBase16: "f70a",
  });

  tester.reserializeAndAssert([10, 11], {
    denseJson: [10, 11],
    binaryFormBase16: "f80a0b",
  });

  tester.reserializeAndAssert([10, 11, 12], {
    denseJson: [10, 11, 12],
    binaryFormBase16: "f9030a0b0c",
  });

  tester.deserializeZeroAndAssert((a) => a.length === 0);
});

describe("string array serializer", () => {
  const itemSerializer = soia.primitiveSerializer("string");
  const serializer = soia.arraySerializer(itemSerializer);
  const tester = new SerializerTester(serializer);

  tester.reserializeAndAssert([], {
    denseJson: [],
    binaryFormBase16: "f6",
  });

  tester.reserializeAndAssert(["foo", "bar"], {
    denseJson: ["foo", "bar"],
    binaryFormBase16: "f8f303666f6ff303626172",
  });
});

describe("bytes array serializer", () => {
  const itemSerializer = soia.primitiveSerializer("bytes");
  const serializer = soia.arraySerializer(itemSerializer);
  const tester = new SerializerTester(serializer);

  tester.reserializeAndAssert([], {
    denseJson: [],
    binaryFormBase16: "f6",
  });

  const a = soia.ByteString.fromBase64("bGlnaHQgdw==");
  const b = soia.ByteString.fromBase64("bGlnaHQgd28=");

  tester.reserializeAndAssert([a, b], {
    denseJson: [a.toBase64(), b.toBase64()],
    binaryFormBase16: "f8f5076c696768742077f5086c6967687420776f",
  });
});