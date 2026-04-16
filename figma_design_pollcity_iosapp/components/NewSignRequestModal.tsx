import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  MapPin,
  User,
  Phone,
  Flag,
  CheckCircle2,
  Zap,
  Navigation,
  Camera,
  MessageSquare,
  AlertCircle,
  Wifi,
  WifiOff,
  Clock,
  Undo2,
} from 'lucide-react';

interface NewSignRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SignRequest {
  id: string;
  address: string;
  name: string;
  phone: string;
  signType: string;
  notes: string;
  photo?: string;
  timestamp: number;
  synced: boolean;
  status: 'pending' | 'assigned' | 'installed' | 'issue';
}

export default function NewSignRequestModal({ isOpen, onClose }: NewSignRequestModalProps) {
  const [formData, setFormData] = useState({
    address: '',
    name: '',
    phone: '',
    signType: 'yard-small',
    notes: '',
    photo: null as string | null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<SignRequest | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [recentAddresses, setRecentAddresses] = useState<string[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showUndo, setShowUndo] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const addressRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending sync count and recent addresses
  useEffect(() => {
    const queue = JSON.parse(localStorage.getItem('signRequestQueue') || '[]');
    setPendingSync(queue.filter((req: SignRequest) => !req.synced).length);

    const recent = JSON.parse(localStorage.getItem('recentAddresses') || '[]');
    setRecentAddresses(recent.slice(0, 5));
  }, [isOpen]);

  // Auto-save draft
  useEffect(() => {
    if (isOpen && (formData.address || formData.name || formData.phone)) {
      localStorage.setItem('signRequestDraft', JSON.stringify(formData));
    }
  }, [formData, isOpen]);

  // Restore draft on open
  useEffect(() => {
    if (isOpen) {
      const draft = localStorage.getItem('signRequestDraft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.address || parsed.name) {
          setFormData(parsed);
        }
      }
      setTimeout(() => addressRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Duplicate detection
  useEffect(() => {
    if (formData.address.length > 5) {
      const queue = JSON.parse(localStorage.getItem('signRequestQueue') || '[]');
      const today = new Date().setHours(0, 0, 0, 0);
      const duplicate = queue.find((req: SignRequest) =>
        req.address.toLowerCase() === formData.address.toLowerCase() &&
        new Date(req.timestamp).setHours(0, 0, 0, 0) === today
      );
      setDuplicateWarning(!!duplicate);
    } else {
      setDuplicateWarning(false);
    }
  }, [formData.address]);

  // Address autocomplete
  useEffect(() => {
    if (formData.address.length > 3) {
      const suggestions = [
        `${formData.address} Street, District 5`,
        `${formData.address} Avenue, District 5`,
        `${formData.address} Road, District 5`,
      ];
      setAddressSuggestions(suggestions);
    } else {
      setAddressSuggestions([]);
    }
  }, [formData.address]);

  // Background sync
  useEffect(() => {
    if (isOnline) {
      syncPendingRequests();
    }
  }, [isOnline]);

  const syncPendingRequests = async () => {
    const queue = JSON.parse(localStorage.getItem('signRequestQueue') || '[]');
    const unsyncedRequests = queue.filter((req: SignRequest) => !req.synced);

    if (unsyncedRequests.length === 0) return;

    for (const request of unsyncedRequests) {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        request.synced = true;
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }

    localStorage.setItem('signRequestQueue', JSON.stringify(queue));
    setPendingSync(queue.filter((req: SignRequest) => !req.synced).length);
  };

  const handleUseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({ ...formData, address: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)} (GPS)` });
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickSubmit = async () => {
    if (!formData.address) {
      addressRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setNetworkError(false);

    const newRequest: SignRequest = {
      id: Date.now().toString(),
      address: formData.address,
      name: formData.name,
      phone: formData.phone,
      signType: formData.signType,
      notes: formData.notes,
      photo: formData.photo || undefined,
      timestamp: Date.now(),
      synced: false,
      status: 'pending',
    };

    const queue = JSON.parse(localStorage.getItem('signRequestQueue') || '[]');
    queue.push(newRequest);
    localStorage.setItem('signRequestQueue', JSON.stringify(queue));

    const recent = [formData.address, ...recentAddresses.filter(a => a !== formData.address)].slice(0, 10);
    localStorage.setItem('recentAddresses', JSON.stringify(recent));

    if (isOnline) {
      try {
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            if (Math.random() > 0.1) {
              resolve(true);
            } else {
              reject(new Error('Network error'));
            }
          }, 600);
        });
        newRequest.synced = true;
        localStorage.setItem('signRequestQueue', JSON.stringify(queue));
      } catch (error) {
        setNetworkError(true);
        setPendingSync(prev => prev + 1);
      }
    } else {
      setPendingSync(prev => prev + 1);
    }

    setIsSubmitting(false);
    setJustSubmitted(true);
    setLastSubmitted(newRequest);
    setShowUndo(true);

    localStorage.removeItem('signRequestDraft');

    setTimeout(() => {
      setShowUndo(false);
    }, 5000);

    setTimeout(() => {
      setJustSubmitted(false);
      setFormData({ address: '', name: '', phone: '', signType: 'yard-small', notes: '', photo: null });
    }, 1500);
  };

  const handleUndo = () => {
    if (!lastSubmitted) return;

    const queue = JSON.parse(localStorage.getItem('signRequestQueue') || '[]');
    const filtered = queue.filter((req: SignRequest) => req.id !== lastSubmitted.id);
    localStorage.setItem('signRequestQueue', JSON.stringify(filtered));

    setShowUndo(false);
    setLastSubmitted(null);

    setFormData({
      address: lastSubmitted.address,
      name: lastSubmitted.name,
      phone: lastSubmitted.phone,
      signType: lastSubmitted.signType,
      notes: lastSubmitted.notes,
      photo: lastSubmitted.photo || null,
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleQuickSubmit();
      }
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key >= '1' && e.key <= '6') {
        const types = ['yard-small', 'yard-large', 'window', 'fence', 'corner', 'business'];
        setFormData({ ...formData, signType: types[parseInt(e.key) - 1] });
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowNotes(!showNotes);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, formData, showNotes]);

  const signTypes = [
    { value: 'yard-small', label: 'Small Yard', emoji: '🏡', key: '1' },
    { value: 'yard-large', label: 'Large Yard', emoji: '🏠', key: '2' },
    { value: 'window', label: 'Window', emoji: '🪟', key: '3' },
    { value: 'fence', label: 'Fence', emoji: '🚧', key: '4' },
    { value: 'corner', label: 'Corner Lot', emoji: '📍', key: '5' },
    { value: 'business', label: 'Business', emoji: '🏢', key: '6' },
  ];

  if (justSubmitted && !showUndo) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="relative bg-white rounded-3xl p-12 shadow-2xl text-center max-w-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ type: 'spring', duration: 0.6 }}
              className="size-20 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center"
            >
              <CheckCircle2 className="size-10 text-white" />
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-slate-900 mb-2"
            >
              {networkError ? 'Saved Offline' : 'Request Captured!'}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-slate-500 text-sm"
            >
              {networkError ? 'Will sync when online' : 'Install team will be notified'}
            </motion.p>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Zap className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Capture Sign Request</h2>
                    <p className="text-xs text-blue-100">Field canvassing - quick entry</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="size-5" />
                </motion.button>
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    {isOnline ? (
                      <Wifi className="size-3.5 text-emerald-300" />
                    ) : (
                      <WifiOff className="size-3.5 text-orange-300" />
                    )}
                    <span className="text-blue-100">
                      {isOnline ? 'Online' : 'Offline Mode'}
                    </span>
                  </div>
                  {pendingSync > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-orange-300" />
                      <span className="text-blue-100">{pendingSync} pending</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Undo Bar */}
            <AnimatePresence>
              {showUndo && lastSubmitted && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-emerald-50 border-b border-emerald-200 overflow-hidden"
                >
                  <div className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-emerald-900">
                      <CheckCircle2 className="size-4" />
                      <span>Captured: {lastSubmitted.address}</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleUndo}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <Undo2 className="size-3" />
                      Undo
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Address */}
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <MapPin className="size-3.5" />
                  Address
                  <span className="text-red-500">*</span>
                  {duplicateWarning && (
                    <span className="text-orange-600 flex items-center gap-1 normal-case text-xs">
                      <AlertCircle className="size-3" />
                      Already captured today
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      ref={addressRef}
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickSubmit();
                        }
                      }}
                      placeholder="123 Main St..."
                      className={`w-full px-4 py-3.5 text-lg border-2 rounded-xl outline-none focus:ring-4 transition-all ${
                        duplicateWarning
                          ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-100'
                          : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                      }`}
                    />
                    {addressSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10">
                        {addressSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setFormData({ ...formData, address: suggestion });
                              setAddressSuggestions([]);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleUseLocation}
                    className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    title="Use current location"
                  >
                    <Navigation className="size-5 text-slate-600" />
                  </motion.button>
                </div>

                {recentAddresses.length > 0 && formData.address.length === 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recentAddresses.map((addr, idx) => (
                      <button
                        key={idx}
                        onClick={() => setFormData({ ...formData, address: addr })}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs text-slate-600 transition-colors"
                      >
                        {addr}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sign Type */}
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Flag className="size-3.5" />
                  Sign Type Requested
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {signTypes.map((type) => (
                    <motion.button
                      key={type.value}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFormData({ ...formData, signType: type.value })}
                      className={`relative p-3 rounded-xl border-2 transition-all ${
                        formData.signType === type.value
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{type.emoji}</div>
                      <div className="text-xs font-semibold text-slate-900">{type.label}</div>
                      <div className={`absolute top-1.5 right-1.5 text-xs font-bold px-1.5 py-0.5 rounded ${
                        formData.signType === type.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {type.key}
                      </div>
                      {formData.signType === type.value && (
                        <motion.div
                          layoutId="selected"
                          className="absolute inset-0 border-2 border-blue-500 rounded-xl"
                          transition={{ type: 'spring', duration: 0.3 }}
                        />
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Quick Fields Row */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <User className="size-3" />
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuickSubmit()}
                    placeholder="Optional"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <Phone className="size-3" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuickSubmit()}
                    placeholder="Optional"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <Camera className="size-3" />
                    Photo
                  </label>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className={`w-full px-3 py-2.5 border-2 border-dashed rounded-lg transition-all ${
                      formData.photo
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    {formData.photo ? '✓' : '+'}
                  </button>
                </div>
              </div>

              {/* Notes Toggle */}
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <MessageSquare className="size-3" />
                {showNotes ? 'Hide notes' : 'Add notes (gate code, etc.)'}
              </button>

              <AnimatePresence>
                {showNotes && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Gate code: 1234, Call first, Dog in yard..."
                      rows={2}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none text-sm"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Keyboard Hint */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs font-mono">⌘</kbd>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs font-mono">↵</kbd>
                    <span>save</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs font-mono">1-6</kbd>
                    <span>sign type</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs font-mono">⌘N</kbd>
                    <span>notes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 px-5 py-4 bg-slate-50 flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="flex-1 px-4 py-3 text-slate-600 hover:text-slate-900 font-semibold text-sm transition-colors rounded-lg hover:bg-slate-200"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleQuickSubmit}
                disabled={!formData.address || isSubmitting}
                className="flex-[2] px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="size-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Zap className="size-4" />
                    <span>Capture Request</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
