import React, { useEffect, useState, useRef } from "react";
import { BASE_URL } from "../../config";
import { 
  Dropdown, 
  Option, 
  Field, 
  tokens, 
  Button, 
  Input, 
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Tooltip,
  makeStyles,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from "@fluentui/react-components";
import { 
  ArrowClockwise16Regular, 
  SignOut24Regular, 
  Settings24Regular,
  AddRegular,
  EditRegular,
  DeleteRegular,
  CheckmarkCircle24Regular,
  DismissCircle24Regular,
  CameraRegular,
} from "@fluentui/react-icons";
import { useAppContext } from "./AppContext";
import ConfirmationDialog from "./ConfirmationDialog";
import StoryModal from "./StoryModal";

const useStyles = makeStyles({
  container: {
    padding: "12px",
    minHeight: "100vh",
    boxSizing: "border-box",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  card: {
    background: "#fff",
    padding: "16px",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: "12px",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
    gap: "8px",
  },
  title: {
    fontSize: "18px",
    margin: 0,
  },
  tableContainer: {
    overflowX: "auto",
    width: "100%",
    marginBottom: "16px",
  },
  newSettingRow: {
    display: "flex",
    gap: "10px",
    marginTop: "16px",
    alignItems: "flex-end",
  },
});

const Profile = ({ isSidebarOpen, showStoryModal, setShowStoryModal, onCloseStories, isActive = true }) => {
  const styles = useStyles();
  const {
    currentUser,
    selectedCompany,
    setSelectedCompany,
    showMessage,
    companies,
    fetchCompanies,
    loading,
    logout,
  } = useAppContext();

  const [settings, setSettings] = useState({
    language: "mn",
    currency: "MNT",
    dateFormat: "YYYY-MM-DD",
    theme: "light",
    emailNotifications: true,
    autoSync: true,
    sessionTimeout: 30,
  });

  const [originalSettings, setOriginalSettings] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newSetting, setNewSetting] = useState({ key: "", value: "" });
  const [editKey, setEditKey] = useState(null);
  const [deleteKey, setDeleteKey] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url);
  
  // Notes & Daily Tasks states
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [dailyTasks, setDailyTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [taskImage, setTaskImage] = useState(null);
  const [taskImagePreview, setTaskImagePreview] = useState(null);
  const [imagePosition, setImagePosition] = useState('contain');
  const [storyEditMode, setStoryEditMode] = useState(false);
  const [editingImagePosition, setEditingImagePosition] = useState('contain');
  const [editingImageScale, setEditingImageScale] = useState(1);
  const [editingImageOffset, setEditingImageOffset] = useState({ x: 0, y: 0 });
  const [isPanningImage, setIsPanningImage] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });
  const [editingTitleOffset, setEditingTitleOffset] = useState({ x: 0, y: 0 });
  const [isPanningTitle, setIsPanningTitle] = useState(false);
  const titlePanStartRef = useRef({ x: 0, y: 0 });
  const titlePanOffsetStartRef = useRef({ x: 0, y: 0 });
  const [editingTitleFontSize, setEditingTitleFontSize] = useState(17);
  const [editingTitleColor, setEditingTitleColor] = useState('#ffffff');

  // Update local avatar when currentUser changes
  useEffect(() => {
    setAvatarUrl(currentUser?.avatar_url);
  }, [currentUser?.avatar_url]);

  useEffect(() => {
    if (currentUser) {
      fetchCompanies(false);
      loadUserSettings();
    }
  }, [fetchCompanies, currentUser]);

  useEffect(() => {
    // Тохиргоо өөрчлөгдсөн эсэхийг шалгах
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const loadUserSettings = async () => {
    try {
      // localStorage-с уншиж авах (хурдан)
      const localSettings = localStorage.getItem('userSettings');
      if (localSettings) {
        setSettings(JSON.parse(localSettings));
      }

      // Backend-аас хэрэглэгчийн тохиргоо татах (компаниас хамаарахгүй)
      const token = localStorage.getItem('authToken');
      if (token) {
        const response = await fetch(`${BASE_URL}/api/user-settings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const serverSettings = await response.json();
          
          // Boolean утгуудыг хөрвүүлэх
          const processedSettings = {};
          Object.entries(serverSettings).forEach(([key, value]) => {
            if (key === 'emailNotifications' || key === 'autoSync') {
              processedSettings[key] = value === 'true';
            } else if (key === 'sessionTimeout') {
              processedSettings[key] = parseInt(value);
            } else {
              processedSettings[key] = value;
            }
          });

          if (Object.keys(processedSettings).length > 0) {
            const newSettings = { ...settings, ...processedSettings };
            setSettings(newSettings);
            setOriginalSettings(newSettings);
            localStorage.setItem('userSettings', JSON.stringify(newSettings));
          } else {
            setOriginalSettings(settings);
          }
        } else {
          setOriginalSettings(settings);
        }
      }
    } catch (error) {
      console.error('Тохиргоо татахад алдаа:', error);
      setOriginalSettings(settings);
    }
  };

  const handleCompanyChange = (_, data) => {
    if (data.optionValue) {
      setSelectedCompany(data.optionValue);
      showMessage(`🏢 ${data.optionValue} компанид шилжлээ.`);
    }
  };

  const handleRefresh = () => {
    fetchCompanies(true);
  };

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
  };

  const handleSaveSettings = async () => {
    console.log('🔵 Хадгалах товч дарагдлаа', settings);
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      console.log('🔵 Token:', token ? 'байна' : 'алга');
      
      if (token) {
        // Зөвхөн өөрчлөгдсөн key-үүдийг олох
        const changedKeys = Object.keys(settings).filter(
          key => settings[key] !== originalSettings[key]
        );
        
        console.log('🔵 Өөрчлөгдсөн key-үүд:', changedKeys);
        
        let savedCount = 0;
        let errorCount = 0;
        
        // Өөрчлөгдсөн бүрийг нэг бүрчлэн хадгалах
        for (const key of changedKeys) {
          try {
            const response = await fetch(`${BASE_URL}/api/user-settings`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ 
                setting_key: key, 
                setting_value: String(settings[key]) 
              }),
            });

            if (response.ok) {
              savedCount++;
            } else {
              errorCount++;
              console.error(`❌ ${key} хадгалахад алдаа:`, response.status);
            }
          } catch (err) {
            errorCount++;
            console.error(`❌ ${key} хадгалахад алдаа:`, err);
          }
        }
        
        if (errorCount === 0) {
          console.log(`✅ ${savedCount} тохиргоо амжилттай хадгалагдлаа`);
          // originalSettings-г шинэчлэх - энэ нь hasChanges-г false болгоно
          const updatedSettings = { ...settings };
          setOriginalSettings(updatedSettings);
          setHasChanges(false);
          showMessage(`✅ ${savedCount} тохиргоо амжилттай хадгалагдлаа!`);
        } else {
          showMessage(`⚠️ ${savedCount} амжилттай, ${errorCount} алдаатай.`, 'warning');
          // Амжилттай хадгалагдсан key-үүдийг originalSettings-д нэмэх
          const updatedOriginal = { ...originalSettings };
          changedKeys.forEach(key => {
            if (settings[key] !== originalSettings[key]) {
              updatedOriginal[key] = settings[key];
            }
          });
          setOriginalSettings(updatedOriginal);
        }
      } else {
        console.warn('⚠️ Token олдсонгүй');
        showMessage('⚠️ Нэвтрэх шаардлагатай.');
      }
    } catch (error) {
      console.error('❌ Тохиргоо хадгалахад алдаа:', error);
      showMessage('❌ Сервертэй холбогдож чадсангүй.');
    } finally {
      setSaving(false);
      console.log('🔵 Saving дууслаа');
    }
  };

  const handleCancelChanges = () => {
    setSettings(originalSettings);
    localStorage.setItem('userSettings', JSON.stringify(originalSettings));
    setHasChanges(false);
    showMessage('🔄 Өөрчлөлтүүд цуцлагдлаа.');
  };

  const handleAddNewSetting = async () => {
    if (!newSetting.key.trim() || !newSetting.value.trim()) {
      showMessage('⚠️ Түлхүүр болон утга шаардлагатай.', 'warning');
      return;
    }

    if (settings[newSetting.key]) {
      showMessage('⚠️ Энэ түлхүүр аль хэдийн байна.', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const response = await fetch(`${BASE_URL}/api/user-settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ setting_key: newSetting.key, setting_value: newSetting.value }),
        });

        if (response.ok) {
          const newSettings = { ...settings, [newSetting.key]: newSetting.value };
          setSettings(newSettings);
          setOriginalSettings(newSettings);
          localStorage.setItem('userSettings', JSON.stringify(newSettings));
          setNewSetting({ key: "", value: "" });
          setShowNewInput(false);
          showMessage('✅ Шинэ тохиргоо амжилттай нэмэгдлээ.');
        } else {
          showMessage('⚠️ Тохиргоо нэмэхэд алдаа гарлаа.', 'error');
        }
      }
    } catch (error) {
      console.error('Тохиргоо нэмэх алдаа:', error);
      showMessage('❌ Сервертэй холбогдож чадсангүй.', 'error');
    }
  };

  const handleDeleteSetting = (key) => {
    const predefinedKeys = ['language', 'currency', 'dateFormat', 'theme', 'emailNotifications', 'autoSync', 'sessionTimeout'];
    if (predefinedKeys.includes(key)) {
      showMessage('⚠️ Үндсэн тохиргоог устгах боломжгүй.', 'warning');
      return;
    }
    
    // Баталгаажуулалт харуулах
    setDeleteKey(key);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = async (confirmed) => {
    setShowDeleteConfirm(false);
    if (!confirmed || !deleteKey) {
      setDeleteKey(null);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        // Шууд DELETE API дуудах
        const response = await fetch(`${BASE_URL}/api/user-settings/${deleteKey}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          // Амжилттай устгагдсан бол local state-г шинэчлэх
          const newSettings = { ...settings };
          delete newSettings[deleteKey];
          setSettings(newSettings);
          setOriginalSettings(newSettings);
          localStorage.setItem('userSettings', JSON.stringify(newSettings));
          showMessage('✅ Тохиргоо амжилттай устгагдлаа.');
        } else {
          showMessage('⚠️ Тохиргоо устгахад алдаа гарлаа.', 'error');
        }
      }
    } catch (error) {
      console.error('Тохиргоо устгах алдаа:', error);
      showMessage('❌ Сервертэй холбогдож чадсангүй.', 'error');
    } finally {
      setDeleteKey(null);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage('⚠️ Зөвхөн зураг файл оруулах боломжтой.', 'error');
      return;
    }

    setUploadingAvatar(true);
    try {
      // Resize and compress image using canvas
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Max dimensions
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = (width * MAX_HEIGHT) / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with compression
          let quality = 0.8;
          let base64String = canvas.toDataURL('image/jpeg', quality);
          
          // If still too large, reduce quality
          while (base64String.length > 700000 && quality > 0.3) {
            quality -= 0.1;
            base64String = canvas.toDataURL('image/jpeg', quality);
          }
          
          if (base64String.length > 700000) {
            showMessage('⚠️ Зургийн хэмжээ хэтэрхий том байна. Өөр зураг сонгоно уу.', 'error');
            setUploadingAvatar(false);
            return;
          }
          
          const token = localStorage.getItem('authToken');
          const response = await fetch(`${BASE_URL}/api/users/${currentUser.id}/avatar`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ avatar: base64String }),
          });

          if (response.ok) {
            const data = await response.json();
            showMessage('✅ Зураг амжилттай солигдлоо.');
            // Update local avatar state
            setAvatarUrl(data.avatar_url);
            // Update currentUser object to trigger re-render
            const updatedUser = { ...currentUser, avatar_url: data.avatar_url };
            // Update localStorage
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            // Emit custom event to update other components
            window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
          } else {
            const error = await response.json();
            showMessage(`⚠️ ${error.error || 'Зураг оруулахад алдаа гарлаа.'}`, 'error');
          }
        } catch (error) {
          console.error('Avatar upload error:', error);
          showMessage('❌ Сервертэй холбогдож чадсангүй.', 'error');
        } finally {
          setUploadingAvatar(false);
        }
      };
      
      img.onerror = () => {
        showMessage('❌ Зураг уншихад алдаа гарлаа.', 'error');
        setUploadingAvatar(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Avatar upload error:', error);
      showMessage('❌ Зураг уншихад алдаа гарлаа.', 'error');
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!currentUser.avatar_url) return;

    setUploadingAvatar(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${BASE_URL}/api/users/${currentUser.id}/avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        showMessage('✅ Зураг амжилттай устгагдлаа.');
        // Update local avatar state
        setAvatarUrl(null);
        // Update currentUser object to trigger re-render
        const updatedUser = { ...currentUser, avatar_url: null };
        // Update localStorage
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        // Emit custom event to update other components
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
      } else {
        const error = await response.json();
        showMessage(`⚠️ ${error.error || 'Зураг устгахад алдаа гарлаа.'}`, 'error');
      }
    } catch (error) {
      console.error('Avatar delete error:', error);
      showMessage('❌ Сервертэй холбогдож чадсангүй.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Fetch Notes
  const fetchNotes = async () => {
    setLoadingNotes(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${BASE_URL}/api/user-notes`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Fetch notes error:', error);
    } finally {
      setLoadingNotes(false);
    }
  };

  // Add Note
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${BASE_URL}/api/user-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newNote }),
      });

      if (response.ok) {
        const data = await response.json();
        setNotes([data, ...notes]);
        setNewNote('');
        showMessage('✅ Note нэмэгдлээ.');
      }
    } catch (error) {
      console.error('Add note error:', error);
      showMessage('❌ Note нэмэхэд алдаа гарлаа.', 'error');
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${BASE_URL}/api/user-notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setNotes(notes.filter(note => note.id !== noteId));
        showMessage('✅ Note устгагдлаа.');
      }
    } catch (error) {
      console.error('Delete note error:', error);
      showMessage('❌ Note устгахад алдаа гарлаа.', 'error');
    }
  };

  // Fetch Daily Tasks
  const fetchDailyTasks = async () => {
    setLoadingTasks(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${BASE_URL}/api/daily-tasks`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDailyTasks(data);
      }
    } catch (error) {
      console.error('Fetch tasks error:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Add Daily Task
  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${BASE_URL}/api/daily-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ task: newTask, due_date: new Date().toISOString().split('T')[0] }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Upload image if selected
        if (taskImage) {
          const imageResponse = await fetch(`${BASE_URL}/api/daily-tasks/${data.id}/image`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              imageBase64: taskImage, 
              imagePosition 
            }),
          });
          
          if (imageResponse.ok) {
            const updatedTask = await imageResponse.json();
            setDailyTasks([...dailyTasks, updatedTask]);
          } else {
            setDailyTasks([...dailyTasks, data]);
          }
        } else {
          setDailyTasks([...dailyTasks, data]);
        }
        
        setNewTask('');
        setTaskImage(null);
        setTaskImagePreview(null);
        setImagePosition('contain');
        showMessage('✅ Ажил нэмэгдлээ.');
      }
    } catch (error) {
      console.error('Add task error:', error);
      showMessage('❌ Ажил нэмэхэд алдаа гарлаа.', 'error');
    }
  };

  // Handle task image selection
  // Save image settings in story modal
  const handleSaveImageSettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const currentTask = dailyTasks[currentStoryIndex];
      
      const response = await fetch(`${BASE_URL}/api/daily-tasks/${currentTask.id}/image/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          image_position: editingImagePosition,
          image_scale: editingImageScale,
          title_offset_x: editingTitleOffset.x,
          title_offset_y: editingTitleOffset.y,
          title_font_size: editingTitleFontSize,
          title_color: editingTitleColor,
        }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setDailyTasks(dailyTasks.map(task => 
          task.id === currentTask.id ? updatedTask : task
        ));
        setStoryEditMode(false);
        showMessage('✅ Зургийн тохиргоо хадгалагдлаа.');
      }
    } catch (error) {
      console.error('Save image settings error:', error);
      showMessage('❌ Тохиргоо хадгалахад алдаа гарлаа.', 'error');
    }
  };

  const normalizeScale = (value) => {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : 1;
  };

  const adjustEditingScale = (delta) => {
    setEditingImageScale((prev) => {
      const current = normalizeScale(prev);
      const next = parseFloat((current + delta).toFixed(2));
      return Math.min(2, Math.max(0.5, next));
    });
  };

  const resetImageOffset = () => setEditingImageOffset({ x: 0, y: 0 });

  const beginImagePan = (clientX, clientY) => {
    if (!storyEditMode) return;
    panStartRef.current = { x: clientX, y: clientY };
    panOffsetStartRef.current = { ...editingImageOffset };
    setIsPanningImage(true);
  };

  const moveImagePan = (clientX, clientY) => {
    if (!isPanningImage) return;
    const dx = clientX - panStartRef.current.x;
    const dy = clientY - panStartRef.current.y;
    setEditingImageOffset({
      x: panOffsetStartRef.current.x + dx,
      y: panOffsetStartRef.current.y + dy,
    });
  };

  const endImagePan = () => {
    setIsPanningImage(false);
  };

  const resetTitleOffset = () => setEditingTitleOffset({ x: 0, y: 0 });

  const beginTitlePan = (clientX, clientY) => {
    if (!storyEditMode) return;
    titlePanStartRef.current = { x: clientX, y: clientY };
    titlePanOffsetStartRef.current = { ...editingTitleOffset };
    setIsPanningTitle(true);
  };

  const moveTitlePan = (clientX, clientY) => {
    if (!isPanningTitle) return;
    const dx = clientX - titlePanStartRef.current.x;
    const dy = clientY - titlePanStartRef.current.y;
    setEditingTitleOffset({
      x: titlePanOffsetStartRef.current.x + dx,
      y: titlePanOffsetStartRef.current.y + dy,
    });
  };

  const endTitlePan = () => {
    setIsPanningTitle(false);
  };

  const handleImageWheel = (e) => {
    if (!storyEditMode) return;
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.05 : -0.05;
    adjustEditingScale(step);
  };

  const handleTaskImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage('⚠️ Зөвхөн зураг файл оруулах боломжтой.', 'error');
      return;
    }

    // Resize and compress image using canvas
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Max dimensions for task images
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions
      if (width > height) {
        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = (width * MAX_HEIGHT) / height;
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 with compression
      let quality = 0.85;
      let base64String = canvas.toDataURL('image/jpeg', quality);
      
      // If still too large, reduce quality
      while (base64String.length > 1000000 && quality > 0.4) {
        quality -= 0.1;
        base64String = canvas.toDataURL('image/jpeg', quality);
      }
      
      if (base64String.length > 1000000) {
        showMessage('⚠️ Зургийн хэмжээ хэтэрхий том байна. Өөр зураг сонгоно уу.', 'error');
        return;
      }
      
      // Store base64 directly
      setTaskImage(base64String);
      setTaskImagePreview(base64String);
    };
    
    img.onerror = () => {
      showMessage('❌ Зураг уншихад алдаа гарлаа.', 'error');
    };
    
    reader.readAsDataURL(file);
  };

  // Remove task image
  const handleRemoveTaskImage = () => {
    setTaskImage(null);
    setTaskImagePreview(null);
    setImagePosition('contain');
  };

  // Delete task image
  const handleDeleteTaskImage = async (taskId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${BASE_URL}/api/daily-tasks/${taskId}/image`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setDailyTasks(dailyTasks.map(task => 
          task.id === taskId ? { ...task, image_url: null } : task
        ));
        showMessage('✅ Зураг устгагдлаа.');
      }
    } catch (error) {
      console.error('Delete task image error:', error);
      showMessage('❌ Зураг устгахад алдаа гарлаа.', 'error');
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (taskId, completed) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${BASE_URL}/api/daily-tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ completed: !completed }),
      });

      if (response.ok) {
        setDailyTasks(dailyTasks.map(task => 
          task.id === taskId ? { ...task, completed: !completed } : task
        ));
      }
    } catch (error) {
      console.error('Toggle task error:', error);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${BASE_URL}/api/daily-tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setDailyTasks(dailyTasks.filter(task => task.id !== taskId));
        showMessage('✅ Ажил устгагдлаа.');
      }
    } catch (error) {
      console.error('Delete task error:', error);
      showMessage('❌ Ажил устгахад алдаа гарлаа.', 'error');
    }
  };

  // Story modal controls need to be declared before the modal JSX below
  const handleCloseStoriesLocal = () => {
    setCurrentStoryIndex(0);
    setStoryEditMode(false);
    if (onCloseStories) {
      onCloseStories();
    } else {
      setShowStoryModal(false);
    }
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swipe up - next story
        if (currentStoryIndex < dailyTasks.length - 1) {
          setCurrentStoryIndex(currentStoryIndex + 1);
        } else {
          handleCloseStoriesLocal();
        }
      } else {
        // Swipe down - previous story
        if (currentStoryIndex > 0) {
          setCurrentStoryIndex(currentStoryIndex - 1);
        }
      }
    }
  };

  // Load notes and tasks on mount (keep hooks before conditional returns)
  useEffect(() => {
    if (currentUser) {
      fetchNotes();
      fetchDailyTasks();
    }
  }, [currentUser]);

  // Keyboard navigation for story modal
  useEffect(() => {
    if (!showStoryModal) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentStoryIndex < dailyTasks.length - 1) {
          setCurrentStoryIndex(currentStoryIndex + 1);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentStoryIndex > 0) {
          setCurrentStoryIndex(currentStoryIndex - 1);
        }
      } else if (e.key === 'Escape') {
        handleCloseStoriesLocal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showStoryModal, currentStoryIndex, dailyTasks.length]);

  const storyModal = (
    <StoryModal
      showStoryModal={showStoryModal}
      onCloseStories={handleCloseStoriesLocal}
      dailyTasks={dailyTasks}
      currentStoryIndex={currentStoryIndex}
      setCurrentStoryIndex={setCurrentStoryIndex}
      loadingTasks={loadingTasks}
      currentUser={currentUser}
      avatarUrl={avatarUrl}
      storyEditMode={storyEditMode}
      setStoryEditMode={setStoryEditMode}
      editingImagePosition={editingImagePosition}
      setEditingImagePosition={setEditingImagePosition}
      editingImageScale={editingImageScale}
      setEditingImageScale={setEditingImageScale}
      editingImageOffset={editingImageOffset}
      editingTitleOffset={editingTitleOffset}
      setEditingTitleOffset={setEditingTitleOffset}
      editingTitleFontSize={editingTitleFontSize}
      setEditingTitleFontSize={setEditingTitleFontSize}
      editingTitleColor={editingTitleColor}
      setEditingTitleColor={setEditingTitleColor}
      handleSaveImageSettings={handleSaveImageSettings}
      adjustEditingScale={adjustEditingScale}
      resetImageOffset={resetImageOffset}
      resetTitleOffset={resetTitleOffset}
      normalizeScale={normalizeScale}
      handleImageWheel={handleImageWheel}
      beginImagePan={beginImagePan}
      moveImagePan={moveImagePan}
      endImagePan={endImagePan}
      isPanningImage={isPanningImage}
      beginTitlePan={beginTitlePan}
      moveTitlePan={moveTitlePan}
      endTitlePan={endTitlePan}
      isPanningTitle={isPanningTitle}
      handleTouchStart={handleTouchStart}
      handleTouchMove={handleTouchMove}
      handleTouchEnd={handleTouchEnd}
    />
  );

  if (!isActive && showStoryModal) {
    return storyModal;
  }

  if (!isActive) {
    return null;
  }

  const handleEditSetting = async (key, value) => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        // Шууд POST API дуудах (single update)
        const response = await fetch(`${BASE_URL}/api/user-settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ setting_key: key, setting_value: String(value) }),
        });

        if (response.ok) {
          // Амжилттай хадгалагдсан бол local state шинэчлэх
          const newSettings = { ...settings, [key]: value };
          setSettings(newSettings);
          setOriginalSettings(newSettings);
          localStorage.setItem('userSettings', JSON.stringify(newSettings));
          setEditKey(null);
          showMessage('✅ Тохиргоо амжилттай хадгалагдлаа.');
        } else {
          showMessage('⚠️ Тохиргоо хадгалахад алдаа гарлаа.', 'error');
        }
      }
    } catch (error) {
      console.error('Тохиргоо засах алдаа:', error);
      showMessage('❌ Сервертэй холбогдож чадсангүй.', 'error');
    }
  };

  const getSettingDisplayValue = (key, value) => {
    if (typeof value === 'boolean') {
      return value ? '✅ Тийм' : '❌ Үгүй';
    }
    if (key === 'language') {
      return value === 'mn' ? '🇲🇳 Монгол' : '🇬🇧 English';
    }
    if (key === 'currency') {
      return value === 'MNT' ? '₮ MNT' : value === 'USD' ? '$ USD' : '€ EUR';
    }
    if (key === 'theme') {
      return value === 'light' ? '☀️ Гэрэл' : '🌙 Харанхуй';
    }
    return value;
  };

  const getSettingLabel = (key) => {
    const labels = {
      language: '🌐 Хэл',
      currency: '💰 Валют',
      dateFormat: '📅 Огноо формат',
      theme: '🎨 Theme',
      emailNotifications: '📧 Email мэдэгдэл',
      autoSync: '🔄 Автомат sync',
      sessionTimeout: '⏱️ Session timeout (мин)',
    };
    return labels[key] || key;
  };

  return (
    <div
      className={styles.container}
      style={{
        marginLeft: isSidebarOpen ? 180 : 50,
        transition: "margin-left 0.3s ease-in-out",
      }}
    >
      {/* Устгах баталгаажуулалт */}
      <ConfirmationDialog 
        isOpen={showDeleteConfirm} 
        onClose={handleDeleteConfirmed}
        message="Та энэ тохиргоог устгахдаа итгэлтэй байна уу?"
      />
            {/* Хэрэглэгчийн профайл зураг */}
      <div className={styles.card} style={{ marginBottom: '24px' }}>
        <div className={styles.header}>
          <h2 className={styles.title}>👤 Профайл зураг</h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
          {/* Avatar preview with camera button */}
          <div style={{ position: 'relative' }}>
            {/* Story ring around avatar */}
            <div 
              onClick={() => setShowStoryModal(true)}
              style={{
                width: '152px',
                height: '152px',
                borderRadius: '50%',
                background: 'transparent',
                padding: 0,
                border: 'none',
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{
                width: '152px',
                height: '152px',
                borderRadius: '50%',
                backgroundColor: 'transparent',
                padding: 0,
              }}>
                <div style={{
                  width: '152px',
                  height: '152px',
                  borderRadius: '50%',
                  backgroundColor: tokens.colorBrandBackground,
                  color: tokens.colorNeutralForegroundOnBrand,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '56px',
                  fontWeight: tokens.fontWeightSemibold,
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}>
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl.startsWith('data:') ? avatarUrl : `${BASE_URL}${avatarUrl}`} 
                      alt="Avatar" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover'
                      }} 
                    />
                  ) : (
                    (currentUser?.name || currentUser?.username || 'Х').charAt(0).toUpperCase()
                  )}
                </div>
              </div>
            </div>
            
            {/* Story text below avatar */}
            {dailyTasks.length > 0 && (
              <div style={{
                textAlign: 'center',
                marginTop: '8px',
                fontSize: '12px',
                fontWeight: '600',
                color: tokens.colorBrandForeground1,
              }}>
                Story үзэх
              </div>
            )}
            
            {/* Camera button with menu */}
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <button
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: tokens.colorNeutralBackground3,
                    border: `3px solid ${tokens.colorNeutralBackground1}`,
                    color: tokens.colorNeutralForeground1,
                    fontSize: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    transition: 'all 0.2s ease',
                    padding: 0,
                    border: 'none',
                    zIndex: 100,
                  }}
                  disabled={uploadingAvatar}
                  title="Зураг оруулах/устгах"
                >
                  <CameraRegular style={{ fontSize: '20px' }} />
                </button>
              </MenuTrigger>
              <MenuPopover style={{ zIndex: 1000 }}>
                <MenuList>
                  <MenuItem onClick={() => document.getElementById('avatar-upload').click()}>
                    📤 Зураг оруулах
                  </MenuItem>
                  {avatarUrl && (
                    <MenuItem onClick={handleDeleteAvatar} style={{ color: '#d13438' }}>
                      🗑️ Устгах
                    </MenuItem>
                  )}
                </MenuList>
              </MenuPopover>
            </Menu>
            
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
            />
          </div>
          
          {/* User info and controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div>
              <h3 style={{ 
                margin: '0 0 4px 0', 
                fontSize: '20px',
                fontWeight: tokens.fontWeightSemibold,
                color: tokens.colorNeutralForeground1
              }}>
                {currentUser?.name || currentUser?.username || 'Хэрэглэгч'}
              </h3>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: tokens.colorNeutralForeground3 
              }}>
                {currentUser?.email || ''}
              </p>
            </div>
            
            {/* Buttons removed - using camera menu instead */}
            <p style={{ 
              margin: 0, 
              fontSize: '12px', 
              color: tokens.colorNeutralForeground3,
              lineHeight: '1.4'
            }}>
              💡 JPG, PNG эсвэл GIF форматтай зураг оруулна уу. Автоматаар 400x400 болгож багасгана.
            </p>
          </div>
        </div>
      </div>

      {/* Daily Tasks/Story - Миний ажлууд */}
      <div className={styles.card} style={{ marginBottom: '24px' }}>
        <div className={styles.header}>
          <h2 className={styles.title}>✅ Миний ажлууд</h2>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: taskImagePreview ? '12px' : '0' }}>
            <Input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Өнөөдөр хийх ажил..."
              style={{ flex: 1 }}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
            />
            <input
              id="task-image-upload"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleTaskImageSelect}
            />
            <Button 
              appearance="subtle" 
              icon={<CameraRegular />}
              onClick={() => document.getElementById('task-image-upload').click()}
              title="Зураг оруулах"
            />
            <Button 
              appearance="primary" 
              onClick={handleAddTask}
              disabled={!newTask.trim() || loadingTasks}
            >
              ➕ Нэмэх
            </Button>
          </div>
          
          {taskImagePreview && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ 
                position: 'relative', 
                display: 'inline-block',
                borderRadius: '8px',
                overflow: 'hidden',
                border: `1px solid ${tokens.colorNeutralStroke1}`
              }}>
                <img 
                  src={taskImagePreview} 
                  alt="Preview" 
                  style={{ 
                    width: '100px', 
                    height: '100px', 
                    objectFit: 'cover',
                    display: 'block'
                  }} 
                />
                <button
                  onClick={handleRemoveTaskImage}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                  }}
                >
                  ✕
                </button>
              </div>
              
              {/* Image Position Selector */}
              <div style={{ flex: 1 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '12px', 
                  color: tokens.colorNeutralForeground3,
                  marginBottom: '6px',
                  fontWeight: 'bold'
                }}>
                  📐 Зургийн харагдалт:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    appearance={imagePosition === 'contain' ? 'primary' : 'secondary'}
                    onClick={() => setImagePosition('contain')}
                    style={{ fontSize: '11px' }}
                  >
                    🖼️ Бүтэн
                  </Button>
                  <Button
                    size="small"
                    appearance={imagePosition === 'cover' ? 'primary' : 'secondary'}
                    onClick={() => setImagePosition('cover')}
                    style={{ fontSize: '11px' }}
                  >
                    ✂️ Дүүргэх
                  </Button>
                  <Button
                    size="small"
                    appearance={imagePosition === 'fill' ? 'primary' : 'secondary'}
                    onClick={() => setImagePosition('fill')}
                    style={{ fontSize: '11px' }}
                  >
                    ↔️ Сунгах
                  </Button>
                </div>
                <p style={{ 
                  fontSize: '10px', 
                  color: tokens.colorNeutralForeground4,
                  margin: '6px 0 0 0'
                }}>
                  {imagePosition === 'contain' && '✓ Зураг бүтэн харагдана'}
                  {imagePosition === 'cover' && '✓ Зураг дэлгэцийг дүүргэнэ'}
                  {imagePosition === 'fill' && '✓ Зураг таарч сунана'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {loadingTasks ? (
            <p style={{ textAlign: 'center', color: tokens.colorNeutralForeground3 }}>Уншиж байна...</p>
          ) : dailyTasks.length === 0 ? (
            <p style={{ textAlign: 'center', color: tokens.colorNeutralForeground3, padding: '20px' }}>
              📋 Ажил алга байна. Эхлэе!
            </p>
          ) : (
            <>
              <div style={{ marginBottom: '12px', fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
                {dailyTasks.filter(t => t.completed).length} / {dailyTasks.length} дууссан
              </div>
              {dailyTasks.map((task) => (
                <div 
                  key={task.id} 
                  style={{ 
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: task.completed ? tokens.colorNeutralBackground2 : tokens.colorNeutralBackground1,
                    borderRadius: '8px',
                    border: `1px solid ${task.completed ? tokens.colorPaletteGreenBorder2 : tokens.colorNeutralStroke1}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: task.completed ? 0.7 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <Switch
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id, task.completed)}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <span style={{ 
                        fontSize: '14px',
                        textDecoration: task.completed ? 'line-through' : 'none',
                        flex: 1
                      }}>
                        {task.task}
                      </span>
                      {task.image_url && (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <img 
                            src={`${BASE_URL}${task.image_url}`} 
                            alt="Task" 
                            style={{ 
                              width: '50px', 
                              height: '50px', 
                              objectFit: 'cover',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const modal = document.createElement('div');
                              modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10000;';
                              modal.onclick = () => modal.remove();
                              const img = document.createElement('img');
                              img.src = `${BASE_URL}${task.image_url}`;
                              img.style.cssText = 'max-width:90%;max-height:90%;border-radius:12px;';
                              modal.appendChild(img);
                              document.body.appendChild(modal);
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTaskImage(task.id);
                            }}
                            style={{
                              position: 'absolute',
                              top: '-6px',
                              right: '-6px',
                              background: '#d13438',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                            title="Зураг устгах"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button 
                    size="small" 
                    appearance="subtle" 
                    icon={<DeleteRegular />}
                    onClick={() => handleDeleteTask(task.id)}
                    style={{ color: '#d13438' }}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Notes - Instagram шиг */}
      <div className={styles.card} style={{ marginBottom: '24px' }}>
        <div className={styles.header}>
          <h2 className={styles.title}>📝 Миний тэмдэглэл</h2>
        </div>
        
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          <Input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Юу бодож байна..."
            style={{ flex: 1 }}
            onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
          />
          <Button 
            appearance="primary" 
            onClick={handleAddNote}
            disabled={!newNote.trim() || loadingNotes}
          >
            ➕ Нэмэх
          </Button>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {loadingNotes ? (
            <p style={{ textAlign: 'center', color: tokens.colorNeutralForeground3 }}>Уншиж байна...</p>
          ) : notes.length === 0 ? (
            <p style={{ textAlign: 'center', color: tokens.colorNeutralForeground3, padding: '20px' }}>
              📭 Одоогоор тэмдэглэл алга байна.
            </p>
          ) : (
            notes.map((note) => (
              <div 
                key={note.id} 
                style={{ 
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: tokens.colorNeutralBackground2,
                  borderRadius: '8px',
                  border: `1px solid ${tokens.colorNeutralStroke1}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{note.content}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
                    🕒 {new Date(note.created_at).toLocaleString('mn-MN', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                <Button 
                  size="small" 
                  appearance="subtle" 
                  icon={<DeleteRegular />}
                  onClick={() => handleDeleteNote(note.id)}
                  style={{ color: '#d13438' }}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Компани сонгох хэсэг */}
      <div className={styles.card} style={{ marginTop: '32px' }}>
        <div className={styles.header}>
          <h2 className={styles.title}>Компани Сонголт</h2>
          <Button
            icon={<ArrowClockwise16Regular />}
            appearance="subtle"
            onClick={handleRefresh}
            aria-label="Сэргээх"
            disabled={loading}
          />
        </div>

        {loading && companies.length === 0 ? null : (
          <Field label="Таны ажиллах боломжтой компаниуд" style={{ maxWidth: "100%", width: "100%" }}>
            <Dropdown
              value={selectedCompany || ""}
              onOptionSelect={handleCompanyChange}
              placeholder="Компани сонгоно уу..."
              disabled={companies.length === 0}
              style={{ width: "100%", maxWidth: "400px" }}
            >
              {companies.map((company) => (
                <Option key={company.id} value={company.id}>
                  {company.name}
                </Option>
              ))}
            </Dropdown>
          </Field>
        )}

        {companies.length === 0 && !loading && (
          <p style={{ color: tokens.colorPaletteRedBackground3 }}>⚠️ Мэдээллийн санд компани бүртгэгдээгүй байна.</p>
        )}
      </div>

      {/* Системийн ерөнхий тохиргоо */}
      <div className={styles.card}>
        <div className={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Settings24Regular />
            <h2 className={styles.title}>Системийн Ерөнхий Тохиргоо</h2>
          </div>
          <Button 
            appearance="primary" 
            icon={<AddRegular />} 
            onClick={() => setShowNewInput(!showNewInput)}
          >
            {showNewInput ? "Болих" : "Шинэ тохиргоо"}
          </Button>
        </div>

        {/* Шинэ тохиргоо нэмэх хэсэг */}
        {showNewInput && (
          <div className={styles.newSettingRow}>
            <Input
              placeholder="Түлхүүр нэр (жишээ: polaris_nessession)"
              value={newSetting.key}
              onChange={(_, data) => setNewSetting({ ...newSetting, key: data.value })}
            />
            <Input
              placeholder="Утга"
              value={newSetting.value}
              onChange={(_, data) => setNewSetting({ ...newSetting, value: data.value })}
            />
            <Button 
              appearance="primary" 
              onClick={handleAddNewSetting}
            >
              Хадгалах
            </Button>
          </div>
        )}

        {/* Тохиргоо хүснэгт */}
        <div className={styles.tableContainer}>
          <h3 style={{ marginBottom: "12px", fontSize: "16px" }}>📋 Бүх тохиргоо</h3>
          <Table style={{ width: "100%", tableLayout: "fixed" }}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell style={{ width: "35%" }}>Тохиргооны нэр</TableHeaderCell>
                <TableHeaderCell style={{ width: "40%" }}>Утга</TableHeaderCell>
                <TableHeaderCell style={{ width: "25%", textAlign: "center" }}>Үйлдэл</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(settings).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell style={{ verticalAlign: "middle" }}>
                    <strong style={{ 
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {getSettingLabel(key)}
                    </strong>
                  </TableCell>
                  <TableCell style={{ verticalAlign: "middle" }}>
                    {editKey === key ? (
                      <>
                        {key === 'language' ? (
                          <Dropdown
                            value={value === 'mn' ? 'Монгол' : 'English'}
                            onOptionSelect={(_, data) => {
                              setSettings({ ...settings, [key]: data.optionValue });
                            }}
                            style={{ width: "100%" }}
                          >
                            <Option value="mn">🇲🇳 Монгол</Option>
                            <Option value="en">🇬🇧 English</Option>
                          </Dropdown>
                        ) : key === 'currency' ? (
                          <Dropdown
                            value={value}
                            onOptionSelect={(_, data) => {
                              setSettings({ ...settings, [key]: data.optionValue });
                            }}
                            style={{ width: "100%" }}
                          >
                            <Option value="MNT">₮ MNT</Option>
                            <Option value="USD">$ USD</Option>
                            <Option value="EUR">€ EUR</Option>
                          </Dropdown>
                        ) : key === 'theme' ? (
                          <Dropdown
                            value={value === 'light' ? 'Гэрэл' : 'Харанхуй'}
                            onOptionSelect={(_, data) => {
                              setSettings({ ...settings, [key]: data.optionValue });
                            }}
                            style={{ width: "100%" }}
                          >
                            <Option value="light">☀️ Гэрэл</Option>
                            <Option value="dark">🌙 Харанхуй</Option>
                          </Dropdown>
                        ) : key === 'emailNotifications' || key === 'autoSync' ? (
                          <Dropdown
                            value={value ? 'Тийм' : 'Үгүй'}
                            onOptionSelect={(_, data) => {
                              setSettings({ ...settings, [key]: data.optionValue === 'true' });
                            }}
                            style={{ width: "100%" }}
                          >
                            <Option value="true">✅ Тийм</Option>
                            <Option value="false">❌ Үгүй</Option>
                          </Dropdown>
                        ) : (
                          <Input
                            value={typeof value === 'boolean' ? String(value) : String(value)}
                            onChange={(_, data) => {
                              const newValue = key === 'sessionTimeout' 
                                ? parseInt(data.value) || 30
                                : data.value;
                              setSettings({ ...settings, [key]: newValue });
                            }}
                            style={{ width: "100%" }}
                          />
                        )}
                      </>
                    ) : (
                      <span style={{ 
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        paddingRight: "8px"
                      }}>
                        {getSettingDisplayValue(key, value)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell style={{ textAlign: "center", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", gap: "4px", justifyContent: "center", flexWrap: "nowrap" }}>
                      {editKey === key ? (
                        <>
                          <Tooltip content="Хадгалах" relationship="label">
                            <Button 
                              icon={<CheckmarkCircle24Regular />} 
                              appearance="subtle"
                              size="small"
                              onClick={() => handleEditSetting(key, settings[key])} 
                            />
                          </Tooltip>
                          <Tooltip content="Болих" relationship="label">
                            <Button 
                              icon={<DismissCircle24Regular />} 
                              appearance="subtle"
                              size="small"
                              onClick={() => {
                                setSettings({ ...settings, [key]: originalSettings[key] || value });
                                setEditKey(null);
                              }} 
                            />
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Tooltip content="Засах" relationship="label">
                            <Button 
                              icon={<EditRegular />} 
                              appearance="subtle"
                              size="small"
                              onClick={() => setEditKey(key)} 
                            />
                          </Tooltip>
                          <Tooltip content="Устгах" relationship="label">
                            <Button 
                              icon={<DeleteRegular />} 
                              appearance="subtle"
                              size="small"
                              onClick={() => handleDeleteSetting(key)}
                            />
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Хадгалах товчнууд */}
        {hasChanges && (
          <div style={{ 
            marginBottom: "16px", 
            padding: "12px", 
            backgroundColor: tokens.colorNeutralBackground2,
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}>
            <div>
              <strong>⚠️ Өөрчлөлтүүд хадгалагдаагүй байна</strong>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Button 
                appearance="secondary" 
                onClick={handleCancelChanges}
                disabled={saving}
              >
                Цуцлах
              </Button>
              <Button 
                appearance="primary" 
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? "Хадгалаж байна..." : "Хадгалах"}
              </Button>
            </div>
          </div>
        )}

        </div>
        {/* Системээс гарах */}
        <Button 
          appearance="secondary" 
          icon={<SignOut24Regular />} 
          onClick={logout}
          style={{ marginTop: '12px' }}
        >
          Системээс гарах
        </Button>
    

      {/* Story Modal */}
      {storyModal}
    </div>
  );
};

export default Profile;
