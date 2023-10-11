import { Drawer, List, ListItem, ListItemText, Button, Switch, FormControlLabel, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { Dispatch, RootState } from "../lib/store";

const ChatDrawer: React.FC<{ chats: string[], switchChat: (id: string) => void, deleteChat: (id: string) => void, drawerOpen: boolean, setDrawerOpen: (bool: boolean) => void }> = ({ chats, switchChat, deleteChat, drawerOpen, setDrawerOpen }) => {
  const appState = useSelector((state: RootState) => state.appState);
  const dispatch = useDispatch<Dispatch>();

  const handleLlavaToggle = (_e: unknown, checked: boolean) => {
    if (checked) {
      dispatch.appState.enableExperiment('llava')
    }
    else {
      dispatch.appState.disableExperiment('llava')
    }
  };

  const isLlavaEnabled = appState.experiments.includes('llava');

  return (
    <Drawer anchor='left' open={drawerOpen} onClose={() => setDrawerOpen(false)}>
      <List
        sx={{
          minWidth: '300px',
        }}
      >
        {chats.map((chat, index) => (
          <ListItem key={index}>
            <ListItemText primary={chat} onClick={() => switchChat(chat)} />
            <Button onClick={() => deleteChat(chat)}>X</Button>
          </ListItem>
        ))}
      </List>
      <List
        sx={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
        }}
      >
        <ListItem>
          <ListItemText primary="Experimental Features" />
        </ListItem>
        <ListItem>
          <FormControlLabel
            control={<Switch checked={isLlavaEnabled} onChange={handleLlavaToggle} />}
            label="Enable LLAVA"
          />
          <Typography variant='caption'>
            Note: you'll need to have configured LLAVA_PATH and LLAVA_MODEL_PATH in your .env file.
          </Typography>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default ChatDrawer;