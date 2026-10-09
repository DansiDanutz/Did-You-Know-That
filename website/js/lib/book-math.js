// A book is a stack of leaves. Leaf k shows face 2k on its front (right side)
// and face 2k+1 on its back (left side once flipped).

export function pageCountPadded(count) {
  return count % 2 === 0 ? count : count + 1;
}

// Single-page reading position -> how many leaves are flipped, which side shows.
export function spreadFor(position) {
  return {
    flipped: Math.floor((position + 1) / 2),
    side: position % 2 === 0 ? "right" : "left",
  };
}

export function canGoNext(visibleFaces, isComplete) {
  return visibleFaces.every((face) => isComplete(face));
}
