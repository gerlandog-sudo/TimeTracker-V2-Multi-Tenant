import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Trash2,
  Play,
  CheckSquare,
  FileText,
  User as UserIcon,
  Projector,
  X,
  Edit2
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { useNotification } from '../context/NotificationContext';
import { format, differenceInSeconds } from 'date-fns';
import { es, enUS, ptBR, pt } from 'date-fns/locale';

interface KanbanTask {
  id: number;
  project_id: number;
  project_name: string;
  user_id: number;
  user_name: string;
  created_by?: number;
  description: string;
  priority: 'Baja' | 'Media' | 'Alta';
  task_type_id?: number | null;
  task_type_name?: string | null;
  estimated_hours: number;
  status: 'ToDo' | 'Doing' | 'Done' | 'Archivo';
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface Column {
  id: string;
  title: string;
  taskIds: number[];
}

const COLUMNS: Record<string, string> = {
  ToDo: 'Para hacer',
  Doing: 'Haciendo',
  Done: 'Hecho',
  Archivo: 'Archivo'
};

const KanbanPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { success: notifySuccess, error: notifyError } = useNotification();
  const [tasks, setTasks] = useState<Record<number, KanbanTask>>({});
  const [showArchivedTasks, setShowArchivedTasks] = useState(true);
  
  // Mapeo de locales para date-fns
  const dateLocales: Record<string, any> = {
    es_AR: es,
    es_ES: es,
    en_US: enUS,
    en_GB: enUS,
    pt_BR: ptBR,
    pt_PT: pt
  };

  const currentLocale = dateLocales[i18n.language] || es;

  const [columns, setColumns] = useState<Record<string, Column>>({
    ToDo: { id: 'ToDo', title: t('kanban.todo'), taskIds: [] },
    Doing: { id: 'Doing', title: t('kanban.doing'), taskIds: [] },
    Done: { id: 'Done', title: t('kanban.done'), taskIds: [] },
    Archivo: { id: 'Archivo', title: t('kanban.archive'), taskIds: [] }
  });

  // Update column titles when language changes
  useEffect(() => {
    setColumns(prev => ({
      ...prev,
      ToDo: { ...prev.ToDo, title: t('kanban.todo') },
      Doing: { ...prev.Doing, title: t('kanban.doing') },
      Done: { ...prev.Done, title: t('kanban.done') },
      Archivo: { ...prev.Archivo, title: t('kanban.archive') }
    }));
  }, [t]);

  const [metadata, setMetadata] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [showConfirmDoneModal, setShowConfirmDoneModal] = useState(false);
  const [selectedTaskForDone, setSelectedTaskForDone] = useState<KanbanTask | null>(null);
  const [doneHours, setDoneHours] = useState('0.00');
  const [doneDescription, setDoneDescription] = useState('');
  
  const [filters, setFilters] = useState({
    user_id: '',
    search: ''
  });

  const { hasPermission } = useTheme();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = Number(currentUser.role_id) === 1;
  const isManager = hasPermission('approvals');

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, metaRes, projectsRes, usersRes] = await Promise.all([
        api.get('/kanban-tasks', { params: { user_id: filters.user_id } }),
        api.get('/metadata'),
        api.get('/projects?status=Activo'),
        api.get('/users?limit=1000')
      ]);

      let fetchedTasks = tasksRes.data;
      console.log('Kanban API response:', fetchedTasks);
      if (!Array.isArray(fetchedTasks)) {
        console.error('Invalid tasks response type:', typeof fetchedTasks, fetchedTasks);
        // If it's not an array, maybe it's an error object or null, fallback to empty array
        fetchedTasks = [];
      }

      const tasksMap: Record<number, KanbanTask> = {};
      const newColumns: Record<string, Column> = {
        ToDo: { id: 'ToDo', title: t('kanban.todo'), taskIds: [] },
        Doing: { id: 'Doing', title: t('kanban.doing'), taskIds: [] },
        Done: { id: 'Done', title: t('kanban.done'), taskIds: [] },
        Archivo: { id: 'Archivo', title: t('kanban.archive'), taskIds: [] }
      };

      fetchedTasks.forEach((task: KanbanTask) => {
        // Apply search filter
        if (filters.search && !task.description.toLowerCase().includes(filters.search.toLowerCase()) && !task.project_name.toLowerCase().includes(filters.search.toLowerCase())) {
            return;
        }
        tasksMap[task.id] = task;
        if (newColumns[task.status]) {
          newColumns[task.status].taskIds.push(task.id);
        }
      });

      setTasks(tasksMap);
      setColumns(newColumns);
      setMetadata(metaRes.data);
      setProjects(Array.isArray(projectsRes.data?.data) ? projectsRes.data.data : (Array.isArray(projectsRes.data) ? projectsRes.data : []));
      
      const usersData = Array.isArray(usersRes.data?.data) ? usersRes.data.data : (Array.isArray(usersRes.data) ? usersRes.data : []);
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching kanban data:', error);
      setLoading(false);
    }
  }, [filters.user_id, filters.search]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Polling every 5 seconds for "real-time" sync
    return () => clearInterval(interval);
  }, [fetchData]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = parseInt(draggableId);
    const destinationCol = destination.droppableId;
    const task = tasks[taskId];

    // Optimistic UI update
    const updatedTasks = { ...tasks };
    const oldStatus = source.droppableId;
    const newStatus = destinationCol;

    if (newStatus === 'Done') {
        // Trigger modal instead of direct move if moving from Doing/ToDo to Done
        const now = new Date();
        const start = task.started_at ? new Date(task.started_at) : (task.created_at ? new Date(task.created_at) : now);
        const seconds = differenceInSeconds(now, start);
        let hours = Math.max(0.5, parseFloat((seconds / 3600).toFixed(2)));
        
        // Round up to nearest 0.5
        hours = Math.ceil(hours * 2) / 2;
        
        setSelectedTaskForDone(task);
        setDoneHours(hours.toString());
        setDoneDescription(task.description);
        setShowConfirmDoneModal(true);
        return; // Don't finalize drag-end yet, wait for modal
    }

    try {
      await api.put(`/kanban-tasks/${taskId}`, { status: newStatus });
      fetchData(); // Sync with server for actual transition
      notifySuccess(t('kanban.move_success', 'Tarea movida correctamente'));
    } catch (error) {
      console.error('Error moving task:', error);
      notifyError(t('kanban.error_move'));
    }
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      project_id: formData.get('project_id'),
      description: formData.get('description'),
      priority: formData.get('priority'),
      task_type_id: formData.get('task_type_id'),
      estimated_hours: formData.get('estimated_hours'),
      user_id: isManager ? formData.get('user_id') : undefined
    };

    try {
      await api.post('/kanban-tasks', data);
      notifySuccess(t('kanban.create_success', 'Tarea creada correctamente'));
      setShowNewTaskModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating task:', error);
      notifyError(t('kanban.error_create'));
    }
  };

  const handleEditTask = (task: KanbanTask) => {
    setEditingTask(task);
    setShowEditTaskModal(true);
  };

  const handleUpdateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTask) return;
    
    const formData = new FormData(e.currentTarget);
    const data = {
      project_id: formData.get('project_id'),
      description: formData.get('description'),
      priority: formData.get('priority'),
      task_type_id: formData.get('task_type_id'),
      estimated_hours: formData.get('estimated_hours'),
      user_id: isManager ? formData.get('user_id') : editingTask.user_id
    };

    try {
      await api.put(`/kanban-tasks/${editingTask.id}`, data);
      notifySuccess(t('kanban.update_success', 'Tarea actualizada correctamente'));
      setShowEditTaskModal(false);
      setEditingTask(null);
      fetchData();
    } catch (error) {
      console.error('Error updating task:', error);
      notifyError(t('kanban.error_update'));
    }
  };

  const handleDeleteTask = (id: number) => {
    setTaskToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete(`/kanban-tasks/${taskToDelete}`);
      setShowDeleteModal(false);
      setTaskToDelete(null);
      fetchData();
      notifySuccess(t('kanban.delete_success', 'Tarea eliminada correctamente'));
    } catch (error) {
      console.error('Error deleting task:', error);
      notifyError(t('kanban.error_delete'));
    }
  };

  const confirmDone = async () => {
    if (!selectedTaskForDone) return;
    try {
      // 1. Create Time Entry
      await api.post('/time-entries', {
        project_id: selectedTaskForDone.project_id,
        task_id: selectedTaskForDone.task_type_id,
        hours: parseFloat(doneHours),
        description: doneDescription,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'submitted',
        user_id: selectedTaskForDone.user_id // Ensure we bill for the task owner, not the mover
      });

      // 2. Update Kanban Task Status to Archivo (per instructions move from Done to Archivo or stay in Done then manually move to Archivo)
      // User requested "columna mas 'archivo' para colocar las tarjetas que ya generaron un registro"
      await api.put(`/kanban-tasks/${selectedTaskForDone.id}`, { status: 'Archivo' });
      
      setShowConfirmDoneModal(false);
      setSelectedTaskForDone(null);
      fetchData();
      notifySuccess(t('kanban.time_logged_success', 'Registro de tiempo creado correctamente'));
    } catch (error) {
      console.error('Error confirming task done:', error);
      notifyError(t('kanban.error_time'));
    }
  };

  const getPriorityColor = (priority: string) => {
    const p = (priority || '').toLowerCase();
    switch (p) {
      case 'alta': 
      case 'high':
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'media':
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'baja':
      case 'low':
        return 'bg-white text-gray-700 border-gray-200';
      default: return 'bg-white text-gray-700 border-gray-200';
    }
  };

  const getPriorityText = (priority: string) => {
    const p = (priority || '').toLowerCase();
    switch (p) {
      case 'alta':
      case 'high':
      case 'critical':
        return t('kanban.priority_high');
      case 'media':
      case 'medium':
        return t('kanban.priority_medium');
      case 'baja':
      case 'low':
        return t('kanban.priority_low');
      default: return priority;
    }
  };

  if (loading && Object.keys(tasks).length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Clock className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('kanban.title')}</h1>
          <p className="text-gray-500">{t('kanban.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowNewTaskModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-medium whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            {t('kanban.new_task')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder={t('kanban.search_placeholder')} 
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
        {isManager && (
          <div className="min-w-[180px]">
            <select 
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              value={filters.user_id}
              onChange={(e) => setFilters(prev => ({ ...prev, user_id: e.target.value }))}
            >
              <option value="">{t('kanban.all_users')}</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer group p-2 pr-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-primary/30 transition-all shadow-sm">
          <div className="relative">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={showArchivedTasks}
              onChange={(e) => setShowArchivedTasks(e.target.checked)}
            />
            <div className="w-10 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-primary transition-colors">
            {t('config.show_archived_column', 'Ver Columna Archivo')}
          </span>
        </label>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-6 -mx-8 px-8 scrollbar-hide" style={{ minHeight: 'calc(100vh - 280px)' }}>
        <DragDropContext onDragEnd={onDragEnd}>
          {Object.values(columns)
            .filter(col => col.id !== 'Archivo' || showArchivedTasks)
            .map((column) => (
            <div key={column.id} className="flex flex-col w-80 shrink-0">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">{column.title}</h3>
                  <span className="bg-white text-primary text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm border border-primary/10">
                    {column.taskIds.length}
                  </span>
                </div>
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 flex flex-col gap-3 p-3 rounded-2xl transition-colors min-h-[100px] ${
                      snapshot.isDraggingOver ? 'bg-primary/5' : 'bg-gray-100/50'
                    }`}
                  >
                    {column.taskIds.map((taskId, index) => {
                      const task = tasks[taskId];
                      if (!task) return null;
                      return (
                        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-5 rounded-2xl border transition-all h-[180px] flex flex-col justify-between ${
                                snapshot.isDragging ? 'shadow-xl rotate-1 scale-105 z-50' : 'shadow-sm hover:shadow-md'
                              } ${getPriorityColor(task.priority)}`}
                            >
                              <div>
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex flex-wrap gap-2">
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-lg border border-white bg-white/40 uppercase tracking-wider shadow-sm">
                                      {getPriorityText(task.priority)}
                                    </span>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-gray-50/40 text-gray-500 border border-white/20 uppercase tracking-wider shadow-sm">
                                      {task.task_type_name || 'Tarea'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    {(isManager || task.user_id === currentUser.id || task.created_by === currentUser.id) && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-primary transition-colors shadow-sm bg-white border border-gray-100"
                                        title={t('kanban.edit_task')}
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {(isManager || task.user_id === currentUser.id || task.created_by === currentUser.id) && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors shadow-sm bg-white border border-gray-100"
                                        title={t('kanban.delete_task')}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <h4 className="text-sm font-black text-gray-900 mb-2 line-clamp-2 leading-snug" title={task.description}>
                                  {task.description}
                                </h4>
                                <p className="text-[11px] text-gray-500 flex items-center gap-2 font-bold">
                                  <Projector className="w-4 h-4 text-primary/40" />
                                  <span className="truncate">{task.project_name}</span>
                                </p>
                              </div>
                              <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0 border border-primary/20">
                                    <UserIcon className="w-4 h-4" />
                                  </div>
                                  <span className="text-[11px] font-black text-gray-700 truncate">
                                    {task.user_name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-black text-gray-900 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                                  {task.estimated_hours} hs
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </DragDropContext>
      </div>

      {/* New Task Modal */}
      <AnimatePresence>
        {showNewTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewTaskModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-base font-bold text-gray-900">{t('kanban.modal_new_title')}</h3>
                <button onClick={() => setShowNewTaskModal(false)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleCreateTask} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 italic">{t('kanban.project_info')}</label>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-0.5">{t('kanban.project_label')}</label>
                          <select name="project_id" defaultValue="" required className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs bg-gray-50">
                            <option value="" disabled>{t('common.select')}</option>
                            {projects.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        {isManager && (
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-0.5">{t('kanban.assign_to_label')}</label>
                            <select name="user_id" defaultValue="" required className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs bg-gray-50">
                              <option value="" disabled>{t('common.select')}</option>
                              {users.filter(u => Number(u.role_id) !== 1).map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-0.5">{t('kanban.task_type_label')}</label>
                          <select name="task_type_id" defaultValue="" required className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs bg-gray-50">
                            <option value="" disabled>{t('common.select')}</option>
                            {metadata?.tasks.map((t: any) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-0.5">{t('kanban.priority_label')}</label>
                          <select name="priority" className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs bg-gray-50 font-bold">
                            <option value="Baja">{t('kanban.priority_low')}</option>
                            <option value="Media">{t('kanban.priority_medium')}</option>
                            <option value="Alta">{t('kanban.priority_high')}</option>
                          </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-0.5">{t('kanban.est_hours_label')}</label>
                        <input 
                          type="number" 
                          name="estimated_hours" 
                          step="0.5" 
                          min="0.5"
                          defaultValue="1.0"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs bg-gray-50 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 italic">{t('kanban.description_label')}</label>
                      <textarea 
                        name="description" 
                        required 
                        rows={8}
                        placeholder={t('kanban.description_placeholder')}
                        className="w-full px-3 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs resize-none bg-gray-50 min-h-[180px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setShowNewTaskModal(false)} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-all">
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="px-8 py-2 rounded-lg bg-primary text-white font-bold text-xs hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95">
                    {t('kanban.new_task')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Task Modal */}
      <AnimatePresence>
        {showEditTaskModal && editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowEditTaskModal(false); setEditingTask(null); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-base font-bold text-gray-900">{t('kanban.modal_edit_title')}</h3>
                <button onClick={() => { setShowEditTaskModal(false); setEditingTask(null); }} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleUpdateTask} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 italic">{t('kanban.project_info')}</label>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-0.5">{t('kanban.project_label')}</label>
                          <select name="project_id" defaultValue={editingTask.project_id} required className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs bg-gray-50">
                            {projects.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        {isManager && (
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-0.5">{t('kanban.assign_to_label')}</label>
                            <select name="user_id" defaultValue={editingTask.user_id} required className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs bg-gray-50">
                              {users.filter(u => u.role !== 'admin').map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-0.5">{t('kanban.task_type_label')}</label>
                          <select name="task_type_id" defaultValue={editingTask.task_type_id || ''} required className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs bg-gray-50">
                            {metadata?.tasks.map((t: any) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-0.5">{t('kanban.priority_label')}</label>
                          <select 
                            name="priority" 
                            defaultValue={
                              ['alta', 'high', 'critical'].includes(editingTask.priority.toLowerCase()) ? 'Alta' : 
                              ['media', 'medium'].includes(editingTask.priority.toLowerCase()) ? 'Media' : 
                              'Baja'
                            } 
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs bg-gray-50 font-bold"
                          >
                            <option value="Baja">{t('kanban.priority_low')}</option>
                            <option value="Media">{t('kanban.priority_medium')}</option>
                            <option value="Alta">{t('kanban.priority_high')}</option>
                          </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-0.5">{t('kanban.est_hours_label')}</label>
                        <input 
                          type="number" 
                          name="estimated_hours" 
                          step="0.5" 
                          min="0.5"
                          defaultValue={editingTask.estimated_hours}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs bg-gray-50 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 italic">{t('kanban.description_label')}</label>
                      <textarea 
                        name="description" 
                        defaultValue={editingTask.description}
                        required 
                        rows={8}
                        placeholder={t('kanban.description_placeholder')}
                        className="w-full px-3 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs resize-none bg-gray-50 min-h-[180px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => { setShowEditTaskModal(false); setEditingTask(null); }} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-all">
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="px-8 py-2 rounded-lg bg-primary text-white font-bold text-xs hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95">
                    {t('kanban.save_changes')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowDeleteModal(false); setTaskToDelete(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">{t('kanban.delete_confirm_title')}</h3>
              <p className="text-gray-500 mb-8 font-medium">{t('kanban.delete_confirm_subtitle')}</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => { setShowDeleteModal(false); setTaskToDelete(null); }}
                  className="flex-1 py-4 bg-gray-50 text-gray-600 font-black rounded-2xl hover:bg-gray-100 transition-all border border-gray-200"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={confirmDeleteTask}
                  className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-xl shadow-red-200 transition-all active:scale-95"
                >
                  {t('common.delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal (Hecho -> Time Entry) */}
      <AnimatePresence>
        {showConfirmDoneModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 flex items-center gap-4 bg-primary/5 border-b border-primary/10">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">{t('kanban.modal_confirm_done_title')}</h3>
                  <p className="text-[11px] text-gray-500 font-medium">{t('kanban.modal_confirm_done_subtitle')}</p>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                          <Projector className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{t('kanban.project_label')}</p>
                          <p className="font-black text-gray-900 text-sm truncate">{selectedTaskForDone?.project_name}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{t('kanban.task_type_label')}</p>
                          <p className="font-black text-gray-900 text-sm truncate">{selectedTaskForDone?.task_type_name || t('kanban.archive')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('kanban.est_hours_label')}</label>
                      <div className="relative group">
                         <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300 group-focus-within:text-primary transition-colors" />
                         <input 
                            type="number" 
                            step="0.5"
                            value={doneHours}
                            onChange={(e) => setDoneHours(e.target.value)}
                            className="w-full pl-12 pr-16 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary/20 focus:bg-white focus:outline-none transition-all font-black text-2xl text-primary shadow-inner"
                         />
                         <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-primary/30 text-lg pointer-events-none tracking-tighter">hs</span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-1.5 italic px-1 font-medium">* {t('kanban.rounded_up', 'Redondeado a 0.5 hacia arriba.')}</p>
                    </div>
                  </div>

                  <div className="flex flex-col h-full">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('kanban.description_label')}</label>
                    <textarea 
                      value={doneDescription}
                      onChange={(e) => setDoneDescription(e.target.value)}
                      placeholder={t('common.comments', 'Agrega comentarios...')}
                      className="flex-1 w-full px-4 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary/20 focus:bg-white focus:outline-none transition-all font-medium text-xs text-gray-900 resize-none shadow-inner min-h-[140px]"
                    />
                    
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => {
                            setShowConfirmDoneModal(false);
                            setSelectedTaskForDone(null);
                            fetchData();
                        }}
                        className="py-3 rounded-2xl text-gray-400 font-bold text-xs hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200"
                      >
                        {t('kanban.discard')}
                      </button>
                      <button 
                        onClick={confirmDone}
                        className="py-3 rounded-2xl bg-primary text-white font-black text-sm hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all"
                      >
                        {t('kanban.done')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KanbanPage;
