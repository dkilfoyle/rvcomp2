import { Button, Grid, HStack } from "@chakra-ui/react";
import _ from "lodash";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useCallback, useMemo, useState, MouseEvent } from "react";
import { IBrilDataSegment } from "../languages/bril/BrilInterface";
import { IHeapVar } from "../languages/bril/interp";

import "./memView.css";

const zeroTo15 = _.range(0, 16);

interface MemViewProps {
  mem: Uint8ClampedArray;
  segments: { name: string; start: number; end: number }[];
  heapVars?: IHeapVar[];
  dataSegment?: IBrilDataSegment;
}

let hoverLine = -1;
let hoverByte = -1;

export const MemView = ({ mem, segments, heapVars, dataSegment }: MemViewProps) => {
  const [startOffset, setStartOffset] = useState<number>(-1);
  const [endOffset, setEndOffset] = useState<number>(-1);

  const onHover = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    document.getElementById(`mvb_${hoverLine}_${hoverByte}`)?.classList.remove("MemViewHover");
    document.getElementById(`mvc_${hoverLine}_${hoverByte}`)?.classList.remove("MemViewHover");
    const [id, line, byte] = e.currentTarget.id.split("_");

    document.getElementById(`mvb_${line}_${byte}`)?.classList.add("MemViewHover");
    document.getElementById(`mvc_${line}_${byte}`)?.classList.add("MemViewHover");

    hoverLine = parseInt(line);
    hoverByte = parseInt(byte);
  }, []);

  const rows = useMemo(() => {
    const startLine = startOffset > -1 ? startOffset / 16 : segments[1].start / 16;
    const endLine = endOffset > -1 ? endOffset / 16 : segments[2].end / 16;
    const dataSize = segments[1].end - segments[1].start;

    return _.range(startLine, endLine).map((lineOffset) => {
      return (
        <div className="MemViewRow" key={"MemViewRow" + lineOffset}>
          <span className="MemViewAddress">{(lineOffset * 16).toString(16).padStart(4, "0")}</span>
          {zeroTo15.map((byteOffset) => {
            // which byte are we at
            const calculatedOffset = lineOffset * 16 + byteOffset;

            // is this byte heap or data
            let curSegment = "Unknown";
            if (dataSize > 0 && calculatedOffset >= segments[1].start && calculatedOffset <= segments[1].end) curSegment = "Data";
            else if (calculatedOffset >= segments[2].start && calculatedOffset <= segments[2].end) curSegment = "Heap";

            // which heap var is this byte in
            let curVar = 0;
            if (curSegment == "Heap" && heapVars) {
              curVar = heapVars.findIndex((hv) => calculatedOffset >= hv.address && calculatedOffset <= hv.endAddress);
            } else if (curSegment == "Data" && dataSegment) {
              curVar = Array.from(dataSegment, ([key, value]) => value).findIndex(
                (di) => calculatedOffset >= di.offset && calculatedOffset <= di.offset + di.size
              );
            }

            const varColor = curVar % 2 ? 1 : 0;
            const byteColor = mem[calculatedOffset] > 0 ? "byteBlack" : "byteGrey";

            return (
              <span
                className={"MemViewByte " + curSegment + varColor + " " + byteColor}
                key={`mvb_${lineOffset}_${byteOffset}`}
                id={`mvb_${lineOffset}_${byteOffset}_${calculatedOffset}_${curVar}`}
                onMouseOver={onHover}>
                {calculatedOffset < mem.length ? mem[calculatedOffset].toString(16).padStart(2, "0") : "__"}
              </span>
            );
          })}
          {zeroTo15.map((byteOffset) => {
            const calculatedOffset = lineOffset * 16 + byteOffset;
            const mybyte = calculatedOffset < mem.length ? mem[calculatedOffset] : 0;
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
  }, [mem, startOffset, endOffset, segments]);

  return (
    <Grid templateRows="auto 1fr" gap="4px" overflow="hidden">
      <HStack>
        <Button
          size="xs"
          className="offsetButton"
          onClick={() => {
            setStartOffset(segments[0].start);
            setEndOffset(segments[0].end);
          }}>
          Screen
        </Button>
        <Button
          size="xs"
          className="offsetButton"
          onClick={() => {
            setStartOffset(segments[1].start);
            setEndOffset(segments[1].end);
          }}>
          Data ({segments[1].end - segments[1].start}b)
        </Button>
        <Button
          size="xs"
          className="offsetButton"
          onClick={() => {
            setStartOffset(segments[2].start);
            setEndOffset(segments[2].end);
          }}>
          Heap ({segments[2].end - segments[2].start}b)
        </Button>
        <Button
          size="xs"
          className="offsetButton"
          onClick={() => {
            setStartOffset(segments[1].start);
            setEndOffset(segments[2].end);
          }}>
          Data+Heap
        </Button>
      </HStack>
      <OverlayScrollbarsComponent height="100%">{rows}</OverlayScrollbarsComponent>
    </Grid>
  );
};
