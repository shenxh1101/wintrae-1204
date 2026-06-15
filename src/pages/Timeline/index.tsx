import { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  FileDown,
  Clock,
  MapPin,
  User,
  Phone,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { TimelineItem, TimelineCategory } from '@/types';
import {
  getTimelineCategoryLabel,
  getTimelineCategoryColor,
  generateTimelineExport,
  exportToText,
} from '@/utils/helpers';

const categories: { value: TimelineCategory; label: string; color: string }[] = [
  { value: 'prep', label: '准备', color: 'bg-champagne-400' },
  { value: 'ceremony', label: '仪式', color: 'bg-rose-400' },
  { value: 'banquet', label: '宴席', color: 'bg-green-400' },
  { value: 'toast', label: '敬酒', color: 'bg-amber-400' },
  { value: 'end', label: '结束', color: 'bg-gray-400' },
];

const TimelinePage = () => {
  const {
    timeline,
    addTimelineItem,
    updateTimelineItem,
    deleteTimelineItem,
    reorderTimeline,
  } = useAppStore();

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    time: '',
    location: '',
    description: '',
    personInCharge: '',
    phone: '',
    category: 'prep' as TimelineCategory,
  });

  const sortedTimeline = useMemo(() => {
    return [...timeline].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [timeline]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      time: '',
      location: '',
      description: '',
      personInCharge: '',
      phone: '',
      category: 'prep',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: TimelineItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      time: item.time,
      location: item.location,
      description: item.description,
      personInCharge: item.personInCharge,
      phone: item.phone,
      category: item.category,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) return;

    if (editingItem) {
      updateTimelineItem(editingItem.id, formData);
    } else {
      const maxOrder = Math.max(...timeline.map((t) => t.orderIndex), -1);
      addTimelineItem({
        ...formData,
        orderIndex: maxOrder + 1,
      });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个环节吗？')) {
      deleteTimelineItem(id);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...sortedTimeline];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    reorderTimeline(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === sortedTimeline.length - 1) return;
    const newItems = [...sortedTimeline];
    [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
    reorderTimeline(newItems);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...sortedTimeline];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    reorderTimeline(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleExport = () => {
    const content = generateTimelineExport(sortedTimeline);
    exportToText(content, '婚礼执行清单.txt');
  };

  const getCategoryInfo = (category: string) => {
    return categories.find((c) => c.value === category) || categories[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-espresso">婚礼流程单</h1>
          <p className="mt-2 text-espresso/60">
            从准备到结束，安排好婚礼当天的每一个环节
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleExport}>
            <FileDown className="w-4 h-4" />
            导出执行清单
          </Button>
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4" />
            添加环节
          </Button>
        </div>
      </div>

      {/* Category Legend */}
      <div className="flex flex-wrap gap-4">
        {categories.map((cat) => (
          <div key={cat.value} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${cat.color}`} />
            <span className="text-sm text-espresso/70">{cat.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="p-6">
          {sortedTimeline.length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="w-12 h-12 text-espresso/20 mx-auto mb-4" />
              <p className="text-espresso/50 mb-4">还没有添加任何环节</p>
              <Button onClick={handleOpenAdd}>
                <Plus className="w-4 h-4" />
                添加第一个环节
              </Button>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[72px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-champagne-200 via-rose-200 to-champagne-200" />

              <div className="space-y-4">
                {sortedTimeline.map((item, index) => {
                  const categoryInfo = getCategoryInfo(item.category);

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative flex gap-4 group ${
                        draggedIndex === index ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Time */}
                      <div className="w-16 flex-shrink-0 pt-2">
                        <span className="font-serif text-lg font-semibold text-espresso">
                          {item.time}
                        </span>
                      </div>

                      {/* Dot */}
                      <div className="relative z-10 flex-shrink-0">
                        <div
                          className={`w-5 h-5 rounded-full ${categoryInfo.color} border-4 border-white shadow-md mt-2.5`}
                        />
                      </div>

                      {/* Card */}
                      <div className="flex-1 ml-2">
                        <div className="bg-gradient-to-br from-rose-50/50 to-champagne-50/50 rounded-xl p-4 hover:shadow-md transition-all group-hover:translate-x-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-espresso">
                                  {item.title}
                                </h3>
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getTimelineCategoryColor(
                                    item.category
                                  )}`}
                                >
                                  {getTimelineCategoryLabel(item.category)}
                                </span>
                              </div>

                              {item.description && (
                                <p className="text-sm text-espresso/60 mb-3">
                                  {item.description}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-4 text-sm">
                                {item.location && (
                                  <div className="flex items-center gap-1.5 text-espresso/60">
                                    <MapPin className="w-4 h-4 text-rose-400" />
                                    {item.location}
                                  </div>
                                )}
                                {item.personInCharge && (
                                  <div className="flex items-center gap-1.5 text-espresso/60">
                                    <User className="w-4 h-4 text-champagne-500" />
                                    {item.personInCharge}
                                  </div>
                                )}
                                {item.phone && (
                                  <div className="flex items-center gap-1.5 text-espresso/60">
                                    <Phone className="w-4 h-4 text-green-500" />
                                    {item.phone}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleMoveUp(index)}
                                disabled={index === 0}
                                className="p-1 rounded hover:bg-white text-espresso/40 hover:text-espresso disabled:opacity-30"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMoveDown(index)}
                                disabled={index === sortedTimeline.length - 1}
                                className="p-1 rounded hover:bg-white text-espresso/40 hover:text-espresso disabled:opacity-30"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-2 rounded-lg hover:bg-white text-espresso/50 hover:text-champagne-600"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 rounded-lg hover:bg-red-50 text-espresso/50 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Drag handle */}
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-5 h-5 text-espresso/30" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-champagne-50 border border-champagne-100 rounded-xl p-4">
        <p className="text-sm text-champagne-800">
          💡 小提示：你可以拖拽环节来调整顺序，或者使用上下箭头按钮移动。
        </p>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? '编辑环节' : '添加环节'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                环节名称 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder="如：新娘化妆"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                时间
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                分类
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as TimelineCategory,
                  })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                地点
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder="如：宴会厅"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-espresso/80 mb-2">
              环节描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
              placeholder="详细描述这个环节的内容..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                负责人
              </label>
              <input
                type="text"
                value={formData.personInCharge}
                onChange={(e) =>
                  setFormData({ ...formData, personInCharge: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder="负责人姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                联系电话
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder="联系电话"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingItem ? '保存修改' : '添加环节'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TimelinePage;
