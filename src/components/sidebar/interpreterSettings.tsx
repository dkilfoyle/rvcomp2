import { Button, Checkbox, HStack, Input, Switch, VStack } from "@chakra-ui/react";
import { useSettingsStore, SettingsState } from "../../store/zustore";

export const InterpreterSettings = () => {
  const setSettings = useSettingsStore((state: SettingsState) => state.set);
  const [mainName, loopName] = useSettingsStore((state: SettingsState) => [state.interp.mainName, state.interp.loopName]);
  const mainArgs = useSettingsStore((state: SettingsState) => state.interp.mainArgs);
  const [loopDelay, loopTimes] = useSettingsStore((state: SettingsState) => [state.interp.loopDelay, state.interp.loopTimes]);
  const [isRunOptim, isRunUnoptim, isRunWasm, isRunRiscv, isRunAuto] = useSettingsStore((state: SettingsState) => [
    state.interp.isRunOptim,
    state.interp.isRunUnoptim,
    state.interp.isRunWasm,
    state.interp.isRunRiscv,
    state.interp.isRunAuto,
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSettings((state: SettingsState) => {
      const name = String(e.target.name) as "mainName" | "mainArgs" | "loopName" | "loopTimes" | "loopDelay";
      if (name in state.interp) {
        state.interp[name] = e.target.value;
      }
    });

  const doMain = () => setSettings((state: SettingsState) => state.interp.doMain++);
  const doLoop = () => setSettings((state: SettingsState) => state.interp.doLoop++);

  return (
    <div>
      <h4>Run</h4>
      <VStack pl={2} spacing={1} alignItems="start">
        <Checkbox
          isChecked={isRunUnoptim}
          size="sm"
          onChange={(e) =>
            setSettings((state: SettingsState) => {
              state.interp.isRunUnoptim = e.target.checked;
            })
          }>
          Un-optimised
        </Checkbox>
        <Checkbox
          isChecked={isRunOptim}
          size="sm"
          onChange={(e) =>
            setSettings((state: SettingsState) => {
              state.interp.isRunOptim = e.target.checked;
            })
          }>
          Optimised
        </Checkbox>
        <Checkbox
          isChecked={isRunWasm}
          size="sm"
          onChange={(e) =>
            setSettings((state: SettingsState) => {
              state.interp.isRunWasm = e.target.checked;
            })
          }>
          Wasm
        </Checkbox>
        <Checkbox
          isChecked={isRunRiscv}
          size="sm"
          onChange={(e) =>
            setSettings((state: SettingsState) => {
              state.interp.isRunRiscv = e.target.checked;
            })
          }>
          Riscv
        </Checkbox>
        <HStack>
          <Switch
            size="sm"
            isChecked={isRunAuto}
            onChange={(e) =>
              setSettings((state: SettingsState) => {
                state.interp.isRunAuto = e.target.checked;
              })
            }>
            Auto
          </Switch>
        </HStack>
      </VStack>
      <VStack align="start" mt={2}>
        <h4>Main</h4>
        <VStack pl={2} spacing={2} justify="start" alignItems="start">
          <Input name="mainName" value={mainName} onChange={handleInputChange} size="xs" placeholder="Function"></Input>
          <Input name="mainArgs" value={mainArgs} onChange={handleInputChange} size="xs" placeholder="Args"></Input>
          <Button onClick={doMain} size="xs">
            Run Main
          </Button>
        </VStack>

        <h4>Loop</h4>
        <VStack align="start" pl={2} spacing={2}>
          <Input size="xs" name="loopName" value={loopName} placeholder="Function" onChange={handleInputChange}></Input>
          <HStack justify="start">
            <Input size="xs" name="loopDelay" value={loopDelay} placeholder="Delay" onChange={handleInputChange}></Input>
            <Input size="xs" name="loopTimes" value={loopTimes} placeholder="Times" onChange={handleInputChange}></Input>
          </HStack>
          <Button onClick={doLoop} size="xs">
            Run Loop
          </Button>
        </VStack>
      </VStack>
    </div>
  );
};
