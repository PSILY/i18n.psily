import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

const NAMESPACE_STORAGE_KEY = "psilyou-selected-namespace";

interface UseNamespaceSelectorOptions {
  autoSelect?: boolean; // Whether to auto-select first namespace if none selected (default: true)
  persist?: boolean; // Whether to persist selection to localStorage (default: true)
}

export function useNamespaceSelector(options: UseNamespaceSelectorOptions = {}) {
  const { autoSelect = true, persist = true } = options;

  // Always try to hydrate from localStorage first
  const [selectedNamespace, setSelectedNamespaceState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(NAMESPACE_STORAGE_KEY) || "";
    }
    return "";
  });

  // Fetch available namespaces
  const {
    data: namespaces,
    isLoading: namespacesLoading,
    error: namespacesError,
  } = useQuery<string[]>({
    queryKey: ["/api/admin/namespaces"],
  });

  // Validate and sync namespace selection when namespaces load
  useEffect(() => {
    if (!namespacesLoading && namespaces) {
      // Handle empty namespace list - clear persisted selection
      if (namespaces.length === 0) {
        setSelectedNamespaceState("");
        if (typeof window !== "undefined") {
          localStorage.removeItem(NAMESPACE_STORAGE_KEY);
        }
        return;
      }
      
      // Validate current selection exists in namespace list
      const isValid = selectedNamespace && namespaces.includes(selectedNamespace);
      
      if (!isValid) {
        // Clear invalid persisted namespace
        if (selectedNamespace && typeof window !== "undefined") {
          localStorage.removeItem(NAMESPACE_STORAGE_KEY);
        }
        
        // Auto-select first namespace if enabled
        if (autoSelect) {
          const firstNamespace = namespaces[0];
          setSelectedNamespaceState(firstNamespace);
          if (persist && typeof window !== "undefined") {
            localStorage.setItem(NAMESPACE_STORAGE_KEY, firstNamespace);
          }
        } else {
          // Clear selection if auto-select is disabled
          setSelectedNamespaceState("");
        }
      }
    }
  }, [selectedNamespace, namespaces, namespacesLoading, autoSelect, persist]);

  // Wrapper to persist to localStorage
  const setSelectedNamespace = (namespace: string) => {
    setSelectedNamespaceState(namespace);
    if (persist && typeof window !== "undefined") {
      if (namespace) {
        localStorage.setItem(NAMESPACE_STORAGE_KEY, namespace);
      } else {
        localStorage.removeItem(NAMESPACE_STORAGE_KEY);
      }
    }
  };

  return {
    selectedNamespace,
    setSelectedNamespace,
    namespaces: namespaces || [],
    namespacesLoading,
    namespacesError,
  };
}
