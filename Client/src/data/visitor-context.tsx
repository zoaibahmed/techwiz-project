import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import {
  loadVisitor,
  saveVisitor,
  demoLocation,
} from './visitor';
import type { Visitor, Locale } from './visitor';
import { en, ur } from './messages';
import type { MessageKey } from './messages';

interface VisitorContextValue {
  visitor: Visitor;
  setVisitor: (visitor: Visitor) => void;
  updateVisitor: (patch: Partial<Visitor>) => void;
  resetToDemo: () => void;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  locale: Locale;
  isRTL: boolean;
  messages: typeof en;
  t: (key: MessageKey) => string;
}

const VisitorContext = createContext<VisitorContextValue | null>(null);

export function VisitorProvider({ children }: { children: ReactNode }) {
  const [visitor, setVisitorState] = useState<Visitor>(() => loadVisitor());
  const [modalOpen, setModalOpen] = useState(false);

  // Sync to localStorage whenever visitor state changes
  const setVisitor = useCallback((next: Visitor) => {
    setVisitorState(next);
    saveVisitor(next);
  }, []);

  const updateVisitor = useCallback(
    (patch: Partial<Visitor>) => {
      setVisitorState((prev) => {
        const next: Visitor = { ...prev, ...patch, version: 1 };
        saveVisitor(next);
        return next;
      });
    },
    [],
  );

  const resetToDemo = useCallback(() => {
    const next: Visitor = {
      version: 1,
      locale: visitor.locale,
      country: demoLocation.country,
      city: demoLocation.city,
      day: demoLocation.days[0],
      seen: true,
    };
    setVisitorState(next);
    saveVisitor(next);
    setModalOpen(false);
  }, [visitor.locale]);

  // Handle first-visit prompt if user has never seen onboarding
  useEffect(() => {
    if (!visitor.seen) {
      const timer = setTimeout(() => {
        setModalOpen(true);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [visitor.seen]);

  // Update HTML document attributes for accessibility and RTL
  const isRTL = visitor.locale === 'ur';
  useEffect(() => {
    document.documentElement.lang = visitor.locale;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    if (isRTL) {
      document.body.classList.add('locale-ur');
    } else {
      document.body.classList.remove('locale-ur');
    }
  }, [visitor.locale, isRTL]);

  const messages = isRTL ? (ur as typeof en) : en;
  const t = useCallback(
    (key: MessageKey): string => {
      return (isRTL ? ur[key] : en[key]) ?? en[key] ?? key;
    },
    [isRTL],
  );

  const value = useMemo<VisitorContextValue>(
    () => ({
      visitor,
      setVisitor,
      updateVisitor,
      resetToDemo,
      modalOpen,
      openModal: () => setModalOpen(true),
      closeModal: () => setModalOpen(false),
      locale: visitor.locale,
      isRTL,
      messages,
      t,
    }),
    [visitor, setVisitor, updateVisitor, resetToDemo, modalOpen, isRTL, messages, t],
  );

  return <VisitorContext.Provider value={value}>{children}</VisitorContext.Provider>;
}

export function useVisitor(): VisitorContextValue {
  const ctx = useContext(VisitorContext);
  if (!ctx) {
    throw new Error('useVisitor must be used within a VisitorProvider');
  }
  return ctx;
}
