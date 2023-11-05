import { useEffect, useState } from 'react';
import { Block, Config } from '../../../server/src/runner';
import { useWebSocket } from './useWebSocket';
import { useChat } from './useChat';

export const useAppWebSocket = ({ onNewStreamChunk }: { onNewStreamChunk: () => void }) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamParts, setStreamParts] = useState<any[]>([]);
  const socket = useWebSocket('ws://localhost:8080');
  const { chats, setChats, listChats } = useChat(socket);
  const [config, setConfig] = useState<Config | null>(null)

  const resetState = () => {
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
      if (data.type === 'blocks') {
        setBlocks(data.blocks)
        // @ts-ignore for debug
        globalThis.Blocks = data.blocks
      }
      if (data.type === 'new-stream') {
        setIsStreaming(true)
      }
      if (data.type === 'end-stream') {
        setIsStreaming(false)
        setStreamParts([])
      }
      if (data.type === 'part') {
        setStreamParts(prev => [...prev, data.part])
        if (!!onNewStreamChunk && typeof onNewStreamChunk === 'function') {
          onNewStreamChunk()
        }
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
    blocks,
    setBlocks,
    isStreaming,
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
