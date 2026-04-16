import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Navigation,
  Camera,
  Phone,
  MessageSquare,
  X,
  Route,
  Filter,
  Upload,
  ChevronRight,
  Home,
  Truck,
  User,
  Flag,
} from 'lucide-react';

interface SignRequest {
  id: string;
  address: string;
  name: string;
  phone: string;
  signType: string;
  notes: string;
  photo?: string;
  timestamp: number;
  status: 'pending' | 'assigned' | 'in-progress' | 'installed' | 'issue';
  installedPhoto?: string;
  installedBy?: string;
  installedAt?: number;
  issueReason?: string;
}

export default function InstallationInterface() {
  const [requests, setRequests] = useState<SignRequest[]>([
    {
      id: '1',
      address: '1234 Oak Street, District 5',
      name: 'Sarah Johnson',
      phone: '(555) 123-4567',
      signType: 'yard-large',
      notes: 'Front yard, near driveway',
      timestamp: Date.now() - 3600000,
      status: 'assigned',
    },
    {
      id: '2',
      address: '1238 Oak Street, District 5',
      name: 'Mike Peters',
      phone: '(555) 234-5678',
      signType: 'yard-small',
      notes: 'Gate code: 1234',
      timestamp: Date.now() - 7200000,
      status: 'assigned',
    },
    {
      id: '3',
      address: '5678 Maple Avenue, District 5',
      name: 'Emily Chen',
      phone: '(555) 345-6789',
      signType: 'window',
      notes: 'Call before arriving',
      timestamp: Date.now() - 10800000,
      status: 'pending',
    },
    {
      id: '4',
      address: '9012 Pine Road, District 5',
      name: 'James Wilson',
      phone: '(555) 456-7890',
      signType: 'fence',
      notes: 'Dog in backyard, use front entrance',
      timestamp: Date.now() - 14400000,
      status: 'in-progress',
    },
    {
      id: '5',
      address: '3456 Elm Street, District 5',
      name: 'Lisa Anderson',
      phone: '(555) 567-8901',
      signType: 'corner',
      notes: '',
      timestamp: Date.now() - 18000000,
      status: 'installed',
      installedAt: Date.now() - 3600000,
      installedBy: 'Team A',
    },
  ]);

  const [selectedRequest, setSelectedRequest] = useState<SignRequest | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [inventory, setInventory] = useState({
    'yard-small': 15,
    'yard-large': 8,
    'window': 12,
    'fence': 6,
    'corner': 4,
    'business': 3,
  });
  const [installPhoto, setInstallPhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInstallPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStatusChange = (requestId: string, newStatus: SignRequest['status']) => {
    setRequests(requests.map(req => {
      if (req.id === requestId) {
        const updated = { ...req, status: newStatus };

        if (newStatus === 'in-progress') {
          // Started working on it
          return updated;
        } else if (newStatus === 'installed') {
          // Mark as complete
          const newInventory = { ...inventory };
          newInventory[req.signType as keyof typeof inventory]--;
          setInventory(newInventory);

          return {
            ...updated,
            installedAt: Date.now(),
            installedBy: 'Team A', // In production, use actual user
            installedPhoto: installPhoto || undefined,
          };
        }

        return updated;
      }
      return req;
    }));

    setInstallPhoto(null);
    setSelectedRequest(null);
  };

  const handleReportIssue = (requestId: string, reason: string) => {
    setRequests(requests.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          status: 'issue',
          issueReason: reason,
        };
      }
      return req;
    }));
    setSelectedRequest(null);
  };

  const filteredRequests = requests.filter(req => {
    if (filterStatus === 'all') return true;
    return req.status === filterStatus;
  });

  const statusCounts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    assigned: requests.filter(r => r.status === 'assigned').length,
    'in-progress': requests.filter(r => r.status === 'in-progress').length,
    installed: requests.filter(r => r.status === 'installed').length,
    issue: requests.filter(r => r.status === 'issue').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'assigned': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in-progress': return 'bg-violet-100 text-violet-700 border-violet-200';
      case 'installed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'issue': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getSignTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'yard-small': 'Small Yard 🏡',
      'yard-large': 'Large Yard 🏠',
      'window': 'Window 🪟',
      'fence': 'Fence 🚧',
      'corner': 'Corner Lot 📍',
      'business': 'Business 🏢',
    };
    return labels[type] || type;
  };

  const totalInventory = Object.values(inventory).reduce((a, b) => a + b, 0);

  return (
    <div className="size-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sign Installation</h1>
            <p className="text-sm text-slate-500">Installation team workspace</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
              <Package className="size-5 text-slate-600" />
              <div>
                <div className="text-xs text-slate-500">Van Inventory</div>
                <div className="text-sm font-bold text-slate-900">{totalInventory} signs</div>
              </div>
            </div>
            <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'map'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Map
              </button>
            </div>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                filterStatus === status
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'list' ? (
          <div className="grid grid-cols-1 gap-3 max-w-4xl">
            {filteredRequests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="size-4 text-slate-400" />
                        <h3 className="font-semibold text-slate-900">{request.address}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        {request.name && (
                          <div className="flex items-center gap-1">
                            <User className="size-3" />
                            <span>{request.name}</span>
                          </div>
                        )}
                        {request.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="size-3" />
                            <span>{request.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Flag className="size-3" />
                          <span>{getSignTypeLabel(request.signType)}</span>
                        </div>
                      </div>
                      {request.notes && (
                        <div className="mt-2 flex items-start gap-2 text-sm">
                          <MessageSquare className="size-3.5 text-amber-500 mt-0.5" />
                          <span className="text-slate-600 italic">{request.notes}</span>
                        </div>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(request.status)}`}>
                      {request.status.replace('-', ' ')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    {request.status === 'pending' && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleStatusChange(request.id, 'assigned')}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Assign to Me
                      </motion.button>
                    )}

                    {request.status === 'assigned' && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleStatusChange(request.id, 'in-progress')}
                          className="flex-1 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Start Installation
                        </motion.button>
                        <button
                          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(request.address)}`, '_blank')}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <Navigation className="size-4" />
                          Navigate
                        </button>
                      </>
                    )}

                    {request.status === 'in-progress' && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedRequest(request)}
                          className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="size-4" />
                          Complete Installation
                        </motion.button>
                        <button
                          onClick={() => {
                            const reason = prompt('What issue did you encounter?');
                            if (reason) handleReportIssue(request.id, reason);
                          }}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <AlertTriangle className="size-4" />
                          Report Issue
                        </button>
                      </>
                    )}

                    {request.status === 'installed' && (
                      <div className="flex-1 text-sm text-emerald-700 flex items-center gap-2">
                        <CheckCircle2 className="size-4" />
                        <span>
                          Installed {new Date(request.installedAt!).toLocaleTimeString()} by {request.installedBy}
                        </span>
                      </div>
                    )}

                    {request.status === 'issue' && (
                      <div className="flex-1 text-sm text-red-700 flex items-start gap-2">
                        <AlertTriangle className="size-4 mt-0.5" />
                        <span>Issue: {request.issueReason}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <MapPin className="size-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Map View</h3>
            <p className="text-sm text-slate-500 mb-4">
              Interactive map with optimized routes coming soon
            </p>
            <div className="text-xs text-slate-400">
              Integration with Google Maps API for route optimization
            </div>
          </div>
        )}
      </div>

      {/* Installation Completion Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Complete Installation</h2>
                      <p className="text-xs text-emerald-100">Upload proof photo</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">Installation Address</div>
                  <div className="text-slate-900">{selectedRequest.address}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Upload Photo of Installed Sign
                  </label>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />

                  {installPhoto ? (
                    <div className="relative">
                      <img src={installPhoto} alt="Installation" className="w-full rounded-lg" />
                      <button
                        onClick={() => setInstallPhoto(null)}
                        className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-lg"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
                    >
                      <Camera className="size-12 mx-auto mb-3 text-slate-400" />
                      <div className="text-sm font-medium text-slate-700">Take Photo</div>
                      <div className="text-xs text-slate-500 mt-1">Required for completion</div>
                    </button>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="size-3" />
                    <span className="font-medium">Inventory Update</span>
                  </div>
                  <div>
                    {getSignTypeLabel(selectedRequest.signType)} will be deducted from van inventory
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 px-5 py-4 bg-slate-50 flex items-center gap-3">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 px-4 py-2.5 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleStatusChange(selectedRequest.id, 'installed')}
                  disabled={!installPhoto}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="size-4" />
                  Mark Installed
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inventory Panel */}
      <div className="bg-white border-t border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Truck className="size-4 text-slate-600" />
              Current Inventory
            </div>
            {Object.entries(inventory).map(([type, count]) => (
              <div key={type} className="text-xs text-slate-600">
                {getSignTypeLabel(type)}: <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
          <div className="text-sm font-bold text-slate-900">
            Total: {totalInventory}
          </div>
        </div>
      </div>
    </div>
  );
}
