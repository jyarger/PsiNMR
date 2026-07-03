import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export interface WebEntry {
  relativePath: string;
  baseURL: string;
}

export interface UserDataset {
  id: string;
  title: string;
  kind: 'files' | 'web';
  files?: File[];
  entries?: WebEntry[];
}

export interface UserSource {
  id: string;
  name: string;
  datasets: UserDataset[];
}

interface UserDataContextValue {
  sources: UserSource[];
  addSource: (
    name: string,
    datasets: Array<Omit<UserDataset, 'id'>>,
  ) => UserSource;
  removeSource: (id: string) => void;
  findDataset: (id: string) => UserDataset | undefined;
}

const UserDataContext = createContext<UserDataContextValue | null>(null);

let counter = 0;
function nextId(prefix: string) {
  counter++;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function UserDataProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<UserSource[]>([]);

  const addSource = useCallback(
    (name: string, datasets: Array<Omit<UserDataset, 'id'>>) => {
      const source: UserSource = {
        id: nextId('src'),
        name,
        datasets: datasets.map((dataset) => ({
          ...dataset,
          id: nextId('data'),
        })),
      };
      setSources((prev) => [source, ...prev]);
      return source;
    },
    [],
  );

  const removeSource = useCallback((id: string) => {
    setSources((prev) => prev.filter((source) => source.id !== id));
  }, []);

  const findDataset = useCallback(
    (id: string) => {
      for (const source of sources) {
        const dataset = source.datasets.find((item) => item.id === id);
        if (dataset) return dataset;
      }
      return undefined;
    },
    [sources],
  );

  const value = useMemo(
    () => ({ sources, addSource, removeSource, findDataset }),
    [sources, addSource, removeSource, findDataset],
  );

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within UserDataProvider');
  }
  return context;
}
