import { useState } from 'react';

export const useChat = (socket: WebSocket | null) => {
  const [chats, setChats] = useState<string[]>([]);

  const listChats = () => {
    if (socket) {
      const payload = {
        type: 'list-chats',
      };
      socket.send(JSON.stringify(payload));
    }
  };

  return { chats, setChats, listChats };
};
