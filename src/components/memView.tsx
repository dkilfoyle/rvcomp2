import _ from "lodash";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useCallback, useMemo, useState, MouseEvent } from "react";

import "./memView.css";

const zeroTo15 = _.range(0, 16);

interface MemViewProps {
  mem: Uint8Array;
}

let hoverLine = -1;
let hoverByte = -1;

export const MemView = ({ mem }: MemViewProps) => {
  // const [hoverLine, setHoverLine] = useState<number>(-1);
  // const [hoverByte, setHoverByte] = useState<number>(-1);

  console.log("render");

  const onHover = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    document.getElementById(`mvb_${hoverLine}_${hoverByte}`)?.classList.remove("MemViewHover");
    document.getElementById(`mvc_${hoverLine}_${hoverByte}`)?.classList.remove("MemViewHover");
    const [id, line, byte] = e.currentTarget.id.split("_");

    document.getElementById(`mvb_${line}_${byte}`)?.classList.add("MemViewHover");
    document.getElementById(`mvc_${line}_${byte}`)?.classList.add("MemViewHover");

    // setHoverLine(parseInt(line));
    // setHoverByte(parseInt(byte));
    hoverLine = parseInt(line);
    hoverByte = parseInt(byte);
  }, []);

  const rows = useMemo(() => {
    const start = 0;
    const end = 64; //64*16=1024bytes = 1k
    return _.range(start, end).map((lineOffset) => {
      return (
        <div className="MemViewRow" key={"MemViewRow" + lineOffset}>
          <span className="MemViewAddress">{(lineOffset * 16).toString(16).padStart(4, "0")}</span>
          {zeroTo15.map((byteOffset) => (
            <span className="MemViewByte" key={`mvb_${lineOffset}_${byteOffset}`} id={`mvb_${lineOffset}_${byteOffset}`} onMouseOver={onHover}>
              {mem[lineOffset * 15 + byteOffset].toString(16).padStart(2, "0")}
            </span>
          ))}
          {zeroTo15.map((byteOffset) => {
            const mybyte = mem[lineOffset * 15 + byteOffset];
            const mybytestr = mybyte >= 32 && mybyte <= 126 ? String.fromCharCode(mybyte) : ".";
            return (
              <span className="MemViewChar" key={`mvc_${lineOffset}_${byteOffset}`} id={`mvc_${lineOffset}_${byteOffset}`}>
                {mybytestr}
              </span>
            );
          })}
        </div>
      );
    });
  }, [mem]);

  return <OverlayScrollbarsComponent>{rows}</OverlayScrollbarsComponent>;
};
