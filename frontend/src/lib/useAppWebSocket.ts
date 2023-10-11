import { useEffect, useState } from 'react';
import { Block, Config } from '../../../server/src/runner';
import { useWebSocket } from './useWebSocket';
import { useChat } from './useChat';

export const useAppWebSocket = () => {
  const [goal, setGoal] = useState('');
  const [goalSent, setGoalSent] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamParts, setStreamParts] = useState<any[]>([]);
  const socket = useWebSocket('ws://localhost:8080');
  const { chats, setChats, listChats } = useChat(socket);
  const [config, setConfig] = useState<Config | null>(null)

  const resetState = () => {
    setGoal('')
    setGoalSent(false)
    setBlocks([])
    setIsStreaming(false)
    setStreamParts([])
  }

  useEffect(() => {
    if (!socket) return;
    socket.onopen = () => {
      console.log('Connected to the server');
      listChats();
    };

    socket.onmessage = event => {
      const data = JSON.parse(event.data);
      if (data.type === 'goal') {
        setGoal(data.content)
        setGoalSent(true)
      }
      if (data.type === 'blocks') {
        setBlocks(data.blocks)
        setIsStreaming(false)
        setStreamParts([])
        // @ts-ignore for debug
        globalThis.Blocks = data.blocks
      }
      if (data.type === 'new-stream') {
        setIsStreaming(true)
      }
      if (data.type === 'part') {
        setStreamParts(prev => [...prev, data.part])
      }
      if (data.type === 'list-chats') {
        setChats(data.content)
      }
      if (data.type === "delete-chat") {
        listChats()
      }
      if (data.type === 'config') {
        console.log('setting config', data.content)
        setConfig(data.content)
      }

    };

    return () => {
      socket.close();
    };
  }, [socket]);

  return {
    goal,
    setGoal,
    goalSent,
    setGoalSent,
    blocks,
    setBlocks,
    isStreaming,
    setIsStreaming,
    streamParts,
    setStreamParts,
    socket,
    chats,
    setChats,
    listChats,
    config,
    resetState,
  };
};
