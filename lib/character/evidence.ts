import type { QuestionBlock } from "@/lib/types/quest";

/**
 * How much evidence the app needs before it will name a student.
 *
 * The class used to be derived at the first block boundary -- question 6 --
 * from five ice-breaker answers, and then locked, so the ~20 interest
 * questions that followed could never displace it. A student who picked
 * "help someone out" four times and "build something" once was named
 * Warsmith, permanently, because a single pick saturated the scale and the
 * tie broke on internal ordering.
 */

/**
 * The blocks that still have interest evidence to come. Everything the
 * interest instrument measures -- 12 Likert items and 2 ipsative rankings --
 * lives in the "riasec" block, so once the student has left it no further
 * interest answer can arrive before the reveal. ("riasec_mi" carries no
 * RIASEC items despite the name; it is Multiple Intelligences questions.)
 */
const BLOCKS_BEFORE_INTEREST_EVIDENCE_IS_IN: readonly QuestionBlock[] = [
  "warmup",
  "riasec",
];

/**
 * True once every interest answer that is going to arrive has arrived.
 *
 * This, and nothing else, gates a *first* naming. It replaced a count of
 * interest responses (>= 10 of them), which looked equivalent in the normal
 * flow -- all 12 Likert items are in one block, so the count cleared in the
 * same commit as the block change -- but was not equivalent on a
 * quit-and-resume. The count only ever saw `riasec_raw`, which the two
 * ipsative rankings never touch, so a student who left having answered 10, 11
 * or 12 of the 12 rating items was named the moment they resumed, from 70% of
 * the interest evidence, and the lock then refused to let the missing 30%
 * change the answer. They finished on a dashboard whose class badge sat on top
 * of a chart that produced a different class.
 *
 * A count cannot express "nothing more is coming"; the block can, because the
 * block *is* the instrument. An already-named or restored student is not
 * affected either way: this gate only ever withholds a naming that has not
 * happened yet, it never revokes one that has.
 */
export function isInterestBlockComplete(block: string): boolean {
  return !BLOCKS_BEFORE_INTEREST_EVIDENCE_IS_IN.includes(
    block as QuestionBlock
  );
}
