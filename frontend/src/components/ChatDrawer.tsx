import { Drawer, List, ListItem, ListItemText, Button } from "@mui/material";

const ChatDrawer: React.FC<{ chats: string[], switchChat: (id: string) => void, deleteChat: (id: string) => void, drawerOpen: boolean }> = ({ chats, switchChat, deleteChat, drawerOpen }) => {
  // Drawer content
  return (
    <Drawer anchor='left' open={drawerOpen} onClose={() => { /*...*/ }}>
      <List>
        {chats.map((chat, index) => (
          <ListItem key={index}>
            <ListItemText primary={chat} onClick={() => switchChat(chat)} />
            <Button onClick={() => deleteChat(chat)}>X</Button>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default ChatDrawer;