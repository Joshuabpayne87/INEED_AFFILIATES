import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, Circle, Calendar, Plus, Trash2, User } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  due_at: string;
  status: 'open' | 'done';
  created_at: string;
  completed_at: string | null;
  connection: {
    id: string;
    partner_name: string;
    partner_email: string;
  } | null;
}

export function FollowUpList() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('open');
  const [showAddModal, setShowAddModal] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);

  const [newTask, setNewTask] = useState({
    title: '',
    due_at: '',
    connection_id: '',
  });

  useEffect(() => {
    if (user) {
      loadTasks();
      loadConnections();
    }
  }, [user]);

  useEffect(() => {
    filterTasks();
  }, [tasks, filter]);

  async function loadConnections() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('connections')
        .select(`
          id,
          requester_user_id,
          recipient_user_id,
          requester:users!connections_requester_user_id_fkey(first_name, last_name, email),
          recipient:users!connections_recipient_user_id_fkey(first_name, last_name, email)
        `)
        .eq('status', 'accepted')
        .or(`requester_user_id.eq.${user.id},recipient_user_id.eq.${user.id}`);

      if (error) throw error;

      const formattedConnections = (data || []).map((conn: any) => {
        const otherUser = conn.requester_user_id === user.id ? conn.recipient : conn.requester;
        return {
          id: conn.id,
          name: `${otherUser.first_name} ${otherUser.last_name}`,
          email: otherUser.email,
        };
      });

      setConnections(formattedConnections);
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  }

  async function loadTasks() {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('partner_tasks')
        .select(`
          *,
          connection:connections!partner_tasks_connection_id_fkey(
            id,
            requester_user_id,
            recipient_user_id,
            requester:users!connections_requester_user_id_fkey(first_name, last_name, email),
            recipient:users!connections_recipient_user_id_fkey(first_name, last_name, email)
          )
        `)
        .eq('user_id', user.id)
        .order('due_at', { ascending: true });

      if (error) throw error;

      const formattedTasks = (data || []).map((task: any) => {
        let partnerInfo = null;
        if (task.connection) {
          const otherUser = task.connection.requester_user_id === user.id
            ? task.connection.recipient
            : task.connection.requester;
          partnerInfo = {
            id: task.connection.id,
            partner_name: `${otherUser.first_name} ${otherUser.last_name}`,
            partner_email: otherUser.email,
          };
        }

        return {
          id: task.id,
          title: task.title,
          due_at: task.due_at,
          status: task.status,
          created_at: task.created_at,
          completed_at: task.completed_at,
          connection: partnerInfo,
        };
      });

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterTasks() {
    if (filter === 'all') {
      setFilteredTasks(tasks);
    } else {
      setFilteredTasks(tasks.filter((task) => task.status === filter));
    }
  }

  async function addTask() {
    if (!user || !newTask.title.trim() || !newTask.due_at || !newTask.connection_id) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('partner_tasks')
        .insert({
          user_id: user.id,
          connection_id: newTask.connection_id,
          title: newTask.title.trim(),
          due_at: new Date(newTask.due_at).toISOString(),
          status: 'open',
        });

      if (error) throw error;

      setNewTask({ title: '', due_at: '', connection_id: '' });
      setShowAddModal(false);
      await loadTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Failed to add task. Please try again.');
    }
  }

  async function toggleTaskStatus(taskId: string, currentStatus: 'open' | 'done') {
    const newStatus = currentStatus === 'open' ? 'done' : 'open';

    try {
      const { error } = await supabase
        .from('partner_tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'done' ? new Date().toISOString() : null,
        })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(
        tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: newStatus,
                completed_at: newStatus === 'done' ? new Date().toISOString() : null,
              }
            : task
        )
      );
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('partner_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  }

  function isOverdue(dueDate: string) {
    return new Date(dueDate) < new Date() && filter !== 'done';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Follow-Up List
          </h1>
          <p className="text-gray-600">Track and manage your partnership follow-up tasks</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={filter === 'open' ? 'primary' : 'secondary'}
          onClick={() => setFilter('open')}
        >
          Open ({tasks.filter((t) => t.status === 'open').length})
        </Button>
        <Button
          size="sm"
          variant={filter === 'done' ? 'primary' : 'secondary'}
          onClick={() => setFilter('done')}
        >
          Completed ({tasks.filter((t) => t.status === 'done').length})
        </Button>
        <Button
          size="sm"
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
        >
          All Tasks ({tasks.length})
        </Button>
      </div>

      {loading ? (
        <Card className="p-6">
          <p className="text-gray-500">Loading tasks...</p>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">
            {filter === 'open' && 'No open tasks'}
            {filter === 'done' && 'No completed tasks'}
            {filter === 'all' && 'No tasks yet. Add your first follow-up task!'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <Card
              key={task.id}
              className={`p-4 ${
                isOverdue(task.due_at) && task.status === 'open'
                  ? 'border-l-4 border-red-500'
                  : task.status === 'done'
                  ? 'bg-gray-50'
                  : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => toggleTaskStatus(task.id, task.status)}
                    className="mt-1"
                  >
                    {task.status === 'done' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400 hover:text-blue-600" />
                    )}
                  </button>

                  <div className="flex-1">
                    <h3
                      className={`text-base font-medium mb-1 ${
                        task.status === 'done'
                          ? 'text-gray-500 line-through'
                          : 'text-gray-900'
                      }`}
                    >
                      {task.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {task.connection && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <User className="w-4 h-4" />
                          <span>{task.connection.partner_name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Due: {new Date(task.due_at).toLocaleDateString()}
                        </span>
                      </div>

                      {isOverdue(task.due_at) && task.status === 'open' && (
                        <Badge variant="danger">Overdue</Badge>
                      )}

                      {task.status === 'done' && task.completed_at && (
                        <Badge variant="success">
                          Completed {new Date(task.completed_at).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => deleteTask(task.id)}
                  className="ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Follow-Up Task"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title
            </label>
            <Input
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="e.g., Follow up on partnership proposal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Partner
            </label>
            <select
              value={newTask.connection_id}
              onChange={(e) =>
                setNewTask({ ...newTask, connection_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a partner...</option>
              {connections.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.name} ({conn.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <Input
              type="datetime-local"
              value={newTask.due_at}
              onChange={(e) => setNewTask({ ...newTask, due_at: e.target.value })}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={addTask}>Add Task</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
