import _ from "lodash";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useMemo } from "react";

import "./memView.css";

const zeroTo15 = _.range(0, 15);

interface MemViewProps {
  mem: Uint8Array;
}

export const MemView = ({ mem }: MemViewProps) => {
  const rows = useMemo(() => {
    const start = 0;
    const end = 640;
    return _.range(start, end).map((lineOffset) => {
      return (
        <div className="MemViewRow">
          <span className="MemViewAddress">{lineOffset.toString(16).padStart(4, "0")}</span>
          {zeroTo15.map((byteOffset) => (
            <span className="MemViewByte">{mem[lineOffset * 15 + byteOffset].toString(16).padStart(2, "0")}</span>
          ))}
          {zeroTo15.map((byteOffset) => {
            const mybyte = mem[lineOffset * 15 + byteOffset];
            const mybytestr = mybyte >= 32 && mybyte <= 126 ? String.fromCharCode(mybyte) : ".";
            return <span className="MemViewChar">{mybytestr}</span>;
          })}
        </div>
      );
    });
  }, [mem]);

  return <OverlayScrollbarsComponent>{rows}</OverlayScrollbarsComponent>;
};
