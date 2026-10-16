import { test } from "node:test";
import assert from "node:assert/strict";

import { parseVtt, cueAt } from "../js/lib/vtt.js";

const SAMPLE = `WEBVTT

1
00:00:01.000 --> 00:00:03.500
Hello there

00:00:05.000 --> 00:00:07.000 align:center line:90%
First line
Second line
`;

test("parseVtt reads ids, settings and multi-line cues", () => {
  // Arrange / Act
  const cues = parseVtt(SAMPLE);
  // Assert
  assert.deepEqual(cues, [
    { start: 1, end: 3.5, text: "Hello there" },
    { start: 5, end: 7, text: "First line\nSecond line" },
  ]);
});

test("parseVtt tolerates a BOM, CRLF and bare CR line ends", () => {
  const crlf = `﻿${SAMPLE.replaceAll("\n", "\r\n")}`;
  assert.deepEqual(parseVtt(crlf), parseVtt(SAMPLE));
  assert.deepEqual(parseVtt(SAMPLE.replaceAll("\n", "\r")), parseVtt(SAMPLE));
});

test("parseVtt accepts timestamps with hours, without hours, and with a comma", () => {
  const cues = parseVtt("WEBVTT\n\n01:02:03.004 --> 01:02:04.5\nlong\n\n12:30,250 --> 12:31.000\nshort\n");
  assert.deepEqual(cues, [
    { start: 750.25, end: 751, text: "short" },
    { start: 3723.004, end: 3724.5, text: "long" },
  ]);
});

test("parseVtt skips NOTE, STYLE and REGION blocks, bad timings, empty and backwards cues", () => {
  const text = `WEBVTT\n\nNOTE a comment\n00:00:01.000 --> 00:00:02.000\n\nSTYLE\n::cue { color: red }\n\nREGION\nid:r\n\nid only\nno timing here\n\n00:00:03.000 --> 00:00:03.000\nzero length\n\n00:00:04.000 --> 00:00:05.000\n\n\n00:00:06.000 --> 00:00:07.000\nkept\n`;
  assert.deepEqual(parseVtt(text), [{ start: 6, end: 7, text: "kept" }]);
});

test("parseVtt returns plain text: markup tags are dropped and basic entities decoded", () => {
  const [cue] = parseVtt("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<v Ana><i>Salut</i> &amp; <b>hei</b> &lt;3 &nbsp;ok &quot;x&quot; &gt;\n");
  assert.equal(cue.text, 'Salut & hei <3  ok "x" >');
  const [script] = parseVtt("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<img src=x onerror=alert(1)>hi\n");
  assert.equal(script.text, "hi");
});

test("parseVtt sorts cues by start and survives empty or non-string input", () => {
  const cues = parseVtt("WEBVTT\n\n00:00:09.000 --> 00:00:10.000\nlate\n\n00:00:01.000 --> 00:00:02.000\nearly\n");
  assert.deepEqual(cues.map((c) => c.text), ["early", "late"]);
  assert.deepEqual(parseVtt(""), []);
  assert.deepEqual(parseVtt(undefined), []);
  assert.deepEqual(parseVtt(null), []);
});

test("cueAt returns the cue text inside a cue and an empty string in gaps, before and after", () => {
  // Arrange
  const cues = parseVtt(SAMPLE);
  // Act / Assert
  assert.equal(cueAt(cues, 0), "", "before the first cue");
  assert.equal(cueAt(cues, 1), "Hello there", "start is inclusive");
  assert.equal(cueAt(cues, 3.49), "Hello there");
  assert.equal(cueAt(cues, 3.5), "", "end is exclusive");
  assert.equal(cueAt(cues, 4.2), "", "gap between cues");
  assert.equal(cueAt(cues, 6), "First line\nSecond line");
  assert.equal(cueAt(cues, 99), "", "after the last cue");
  assert.equal(cueAt([], 1), "", "no cues");
});

test("cueAt finds the right cue among many (binary search)", () => {
  const cues = Array.from({ length: 1000 }, (_, i) => ({ start: i * 2, end: i * 2 + 1, text: `c${i}` }));
  assert.equal(cueAt(cues, 1000.5), "c500");
  assert.equal(cueAt(cues, 1001.5), "");
  assert.equal(cueAt(cues, 1998.2), "c999");
});
