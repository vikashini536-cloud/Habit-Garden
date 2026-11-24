// Draws a plant from the stage and wilt values the backend sends.
// This component never decides growth. It only shows what it is given.

const STAGE_NAMES = {
  seed: 'Seed',
  seedling: 'Seedling',
  young: 'Young plant',
  growing: 'Growing plant',
  mature: 'Mature plant',
  blooming: 'Blooming',
};

// How tall the stem is and how many leaves and flowers each stage has.
const STAGE_LAYOUT = {
  seed: { stem: 0, leaves: 0, flower: false },
  seedling: { stem: 30, leaves: 2, flower: false },
  young: { stem: 52, leaves: 4, flower: false },
  growing: { stem: 74, leaves: 6, flower: false },
  mature: { stem: 92, leaves: 8, flower: false },
  blooming: { stem: 92, leaves: 8, flower: true },
};

const BASE_X = 60;
const BASE_Y = 124;
const LEAF_RX = 13;
const LEAF_RY = 6.5;

// Leaves alternate left and right, spaced up the stem.
function leafPositions(count, stem) {
  return Array.from({ length: count }, (_, i) => ({
    side: i % 2 === 0 ? -1 : 1,
    y: BASE_Y - stem * (0.25 + (0.7 * i) / Math.max(count - 1, 1)),
  }));
}

function wiltClass(wilt) {
  if (wilt === 'wilted') return 'plant--wilted';
  if (wilt === 'slight') return 'plant--slight';
  return 'plant--healthy';
}

export default function Plant({ stage, wilt = 'none' }) {
  const layout = STAGE_LAYOUT[stage] ?? STAGE_LAYOUT.seed;
  const stageName = STAGE_NAMES[stage] ?? 'Seed';
  const wiltText = wilt === 'none' ? '' : ', needs some care';
  const topY = BASE_Y - layout.stem;
  const leaves = leafPositions(layout.leaves, layout.stem);

  return (
    <svg
      className={`plant plant--${stage} ${wiltClass(wilt)}`}
      viewBox="0 14 120 124"
      role="img"
      aria-label={`${stageName}${wiltText}`}
    >
      <ellipse className="plant__soil" cx="60" cy="128" rx="44" ry="8" />

      {stage === 'seed' ? (
        <ellipse className="plant__seed" cx="60" cy="122" rx="7" ry="5" />
      ) : (
        <>
          <path
            className="plant__stem"
            d={`M${BASE_X} ${BASE_Y} Q ${BASE_X + 3} ${BASE_Y - layout.stem / 2} ${BASE_X} ${topY}`}
          />
          {leaves.map((leaf, i) => (
            <g key={i} transform={`translate(${BASE_X} ${leaf.y})`}>
              <g className="plant__leaf" style={{ '--side': leaf.side }}>
                <ellipse
                  className="plant__leaf-shape"
                  cx={leaf.side * LEAF_RX}
                  cy="0"
                  rx={LEAF_RX}
                  ry={LEAF_RY}
                />
              </g>
            </g>
          ))}
          {layout.flower && (
            // Position goes on the outer group. The bloom animation uses CSS transform on the inner
            // group, and a CSS transform would replace a position attribute on the same element.
            <g transform={`translate(${BASE_X} ${topY})`}>
              <g className="plant__flower">
                {[0, 72, 144, 216, 288].map((angle) => (
                  <circle
                    key={angle}
                    cx={Math.cos((angle * Math.PI) / 180) * 7}
                    cy={Math.sin((angle * Math.PI) / 180) * 7}
                    r="5.5"
                  />
                ))}
                <circle className="plant__flower-center" cx="0" cy="0" r="3.5" />
              </g>
            </g>
          )}
        </>
      )}
    </svg>
  );
}
