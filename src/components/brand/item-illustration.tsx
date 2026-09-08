/** Small category drawings identify a missing photo without pretending to be the item. */
export function ItemIllustration({
  category,
  className = "",
}: {
  category: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 160"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M36 137h168" opacity=".25" />
        {category === "books" || category === "notes" ? (
          <>
            <path d="M57 113h123v20H57c-14 0-14-20 0-20Z" fill="#fffdf8" />
            <path d="M65 89h120v22H65c-13 0-13-22 0-22Z" fill="#e9c878" />
            <path d="m66 50 108-13 8 47-108 13Z" fill="#fffdf8" />
            <path d="m81 49 5 46M93 59l54-7M97 71l32-4M70 121h103M77 98h100" />
            <path d="m139 113 0 29 9-6 8 6v-29" fill="#a85d3f" />
          </>
        ) : category === "calculators" ? (
          <>
            <rect x="78" y="22" width="85" height="112" rx="9" fill="#fffdf8" />
            <path d="M88 35h65v27H88z" fill="#bcc9af" />
            <path d="M122 44h5v9h-5M135 44h8v9h-8" />
            {[0, 1, 2].flatMap((row) =>
              [0, 1, 2, 3].map((col) => (
                <rect
                  key={`${row}-${col}`}
                  x={90 + col * 17}
                  y={74 + row * 17}
                  width="10"
                  height="9"
                  rx="1"
                  fill={row === 2 && col === 3 ? "#e9c878" : "#eee8dd"}
                />
              )),
            )}
          </>
        ) : category === "electronics" ? (
          <>
            <rect x="49" y="30" width="143" height="90" rx="5" fill="#fffdf8" />
            <path d="M59 41h123v67H59z" fill="#c8d3c4" />
            <path d="m96 62-15 13 15 13m49-26 15 13-15 13m-15-31-15 44" />
            <path d="m49 120-15 14h173l-15-14Z" fill="#fffdf8" />
          </>
        ) : category === "lab" ? (
          <>
            <path
              d="M94 26h52m-43 0v38l-37 56q-8 14 10 14h90q16 0 9-14l-37-56V26"
              fill="#fffdf8"
            />
            <path d="m88 92-17 29q-4 8 6 8h87q11 0 6-8l-18-29Z" fill="#e9c878" />
            <circle cx="111" cy="99" r="4" />
            <circle cx="139" cy="114" r="5" />
            <path d="M108 62h22" />
          </>
        ) : category === "art" ? (
          <>
            <path d="M76 41h95v92H76z" fill="#fffdf8" />
            <path d="m84 116 28-37 19 23 16-18 15 32Z" fill="#bcc9af" />
            <circle cx="145" cy="64" r="10" fill="#e9c878" />
            <path d="m50 125 7-67 12 1-7 67-7 10Z" fill="#e9c878" />
            <path d="M58 51q-8-18 7-26 12 16 3 27Z" fill="#a85d3f" />
          </>
        ) : category === "projects" ? (
          <>
            <rect x="66" y="37" width="116" height="94" rx="6" fill="#bcc9af" />
            <rect x="101" y="64" width="42" height="40" fill="#fffdf8" />
            <path d="M109 53v11m12-11v11m13-11v11m-25 40v11m12-11v11m13-11v11M89 73h12m-12 12h12m-12 12h12m42-24h12m-12 12h12m-12 12h12M76 49h11v17H76z" />
            <circle cx="167" cy="48" r="4" />
            <circle cx="77" cy="119" r="4" />
          </>
        ) : (
          <>
            <path d="m57 131 118-98v98Z" fill="#fffdf8" />
            <path d="m100 113 56-46v46Z" fill="#e9c878" />
            <path d="m63 117 7 7m7-19 7 7m7-19 7 7m7-19 7 7m7-19 7 7m7-19 7 7m7-19 7 7" />
            <path d="m67 30 15-6 37 82-15 6Z" fill="#bcc9af" />
          </>
        )}
      </g>
    </svg>
  );
}
