import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Checkbox,
  Icon,
  VStack,
} from "@chakra-ui/react";
import { extendTheme } from "@chakra-ui/react";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";
import { examples } from "../examples/examples";
import { useSettingsStore, SettingsState } from "../store/zustore";
import shallow from "zustand/shallow";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

import { VscListTree } from "react-icons/vsc";
import { GiSlowBlob } from "react-icons/gi";
import { GoFile, GoFileDirectory } from "react-icons/go";
import { FaRunning, FaShippingFast } from "react-icons/fa";
import { SiWebassembly } from "react-icons/si";

import { DragDropContext, Droppable, Draggable, DropResult, ResponderProvided, DraggableLocation } from "react-beautiful-dnd";
import { useState } from "react";

const fullHeight = { maxHeight: "100%", height: "100%" };

const grid = 8;

const getItemStyle = (isDragging: boolean, draggableStyle: any, selected: boolean) => ({
  // some basic styles to make the items look a bit nicer
  userSelect: "none",

  // change background colour if dragging
  background: isDragging ? "lightgreen" : selected ? "#E2E8F0" : "#CBD5E0",

  // styles we need to apply on draggables
  ...draggableStyle,
});

const getListStyle = (isDraggingOver: boolean, selected: boolean) => ({
  background: isDraggingOver ? "lightblue" : selected ? "#E2E8F0" : "#CBD5E0",
  padding: grid,
});

const reorder = (list: string[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

const move = (source: string[], destination: string[], droppableSource: DraggableLocation, droppableDestination: DraggableLocation) => {
  const sourceClone = Array.from(source);
  const destClone = Array.from(destination);
  const [removed] = sourceClone.splice(droppableSource.index, 1);

  destClone.splice(droppableDestination.index, 0, removed);

  const result: { selected: string[]; available: string[] } = { selected: [], available: [] };
  result[droppableSource.droppableId as "selected" | "available"] = sourceClone;
  result[droppableDestination.droppableId as "selected" | "available"] = destClone;

  return result;
};

export const OptimList = () => {
  const optimisations = useSettingsStore((state: SettingsState) => state.optimisations);
  const setSettings = useSettingsStore((state: SettingsState) => state.set);

  const onDragEnd = (result: DropResult, provided: ResponderProvided) => {
    const { source, destination } = result;

    // dropped outside the list
    if (!destination) {
      return;
    }

    const from = source.droppableId as "selected" | "available";
    const to = destination.droppableId as "selected" | "available";

    if (source.droppableId === destination.droppableId) {
      // reordering within list
      const items = reorder(optimisations[from], source.index, destination.index);
      setSettings((state: SettingsState) => {
        state.optimisations[from] = items;
      });
    } else {
      // dragging between lists
      const result = move(optimisations[from], optimisations[to], source, destination);

      setSettings((state: SettingsState) => {
        state.optimisations = result;
      });
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="selected">
        {(provided, snapshot) => (
          <div {...provided.droppableProps} ref={provided.innerRef} style={getListStyle(snapshot.isDraggingOver, true)}>
            {optimisations.selected.map((item, index) => (
              <Draggable key={item} draggableId={item} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={getItemStyle(snapshot.isDragging, provided.draggableProps.style, true)}>
                    <Checkbox
                      isChecked
                      onChange={(e) => {
                        if (!e.target.checked) {
                          const result = move(
                            optimisations.selected,
                            optimisations.available,
                            { droppableId: "selected", index },
                            { droppableId: "available", index: 0 }
                          );
                          setSettings((state: SettingsState) => {
                            state.optimisations = result;
                          });
                        }
                      }}>
                      {item}
                    </Checkbox>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <Droppable droppableId="available">
        {(provided, snapshot) => (
          <div {...provided.droppableProps} ref={provided.innerRef} style={getListStyle(snapshot.isDraggingOver, false)}>
            {optimisations.available.map((item, index) => (
              <Draggable key={item} draggableId={item} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={getItemStyle(snapshot.isDragging, provided.draggableProps.style, false)}>
                    <Checkbox> {item}</Checkbox>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
