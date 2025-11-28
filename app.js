// Splash Screen Logic
window.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    const homePage = document.getElementById('home-page');
    
    // بعد 3 ثواني بالضبط
    setTimeout(() => {
        splashScreen.classList.add('hide');
        homePage.classList.add('active');
    }, 3000);
});

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAbdpK9bcBbupivLB9nmF7TA2ATuliMgvw",
    authDomain: "altamayoz-d343a.firebaseapp.com",
    projectId: "altamayoz-d343a",
    storageBucket: "altamayoz-d343a.firebasestorage.app",
    messagingSenderId: "448356728450",
    appId: "1:448356728450:web:80433ab12f01d812823e9b",
    measurementId: "G-N8P5LKCML9"
};

// Initialize Firebase
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    
    // Enable offline persistence
    db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            if (err.code == 'failed-precondition') {
                console.log('Multiple tabs open');
            } else if (err.code == 'unimplemented') {
                console.log('Browser does not support persistence');
            }
        });
} catch (error) {
    console.error('Firebase initialization error:', error);
    alert('خطأ في الاتصال بقاعدة البيانات. تأكد من إعدادات Firebase.');
}

// Global State
let currentGrade = null;
let currentSubject = null;
let currentTeacher = null;
let currentGroup = null;
let currentStudent = null;
let navigationStack = [];

// Get current month
function getCurrentMonth() {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return months[new Date().getMonth()];
}

// تم إزالة المواد الافتراضية - يجب إضافة المواد يدوياً

// Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    navigationStack.push(pageId);
}

function goBack() {
    navigationStack.pop();
    const previousPage = navigationStack[navigationStack.length - 1] || 'home-page';
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(previousPage).classList.add('active');
    
    // Update breadcrumb based on the page we're going back to
    if (previousPage === 'home-page') {
        updateBreadcrumb('الصفحة الرئيسية');
    } else if (previousPage === 'subjects-page' && currentGrade) {
        updateBreadcrumb(currentGrade.name);
    } else if (previousPage === 'teachers-page' && currentGrade && currentSubject) {
        updateBreadcrumb(`${currentGrade.name} > ${currentSubject}`);
    } else if (previousPage === 'groups-page' && currentGrade && currentSubject && currentTeacher) {
        updateBreadcrumb(`${currentGrade.name} > ${currentSubject} > ${currentTeacher.name}`);
    } else if (previousPage === 'students-page' && currentGrade && currentSubject && currentTeacher && currentGroup) {
        updateBreadcrumb(`${currentGrade.name} > ${currentSubject} > ${currentTeacher.name} > ${currentGroup.day}`);
    }
}

// Navigate to home page
function goToHome() {
    navigationStack = [];
    currentGrade = null;
    currentSubject = null;
    currentTeacher = null;
    currentGroup = null;
    currentStudent = null;
    
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('home-page').classList.add('active');
    updateBreadcrumb('الصفحة الرئيسية');
}

// Update breadcrumb in navigation bar
function updateBreadcrumb(text) {
    const navPath = document.getElementById('nav-path');
    if (navPath) {
        navPath.textContent = text;
    }
}

// 1. اختيار السنة
function selectGrade(gradeId, gradeName) {
    currentGrade = { id: gradeId, name: gradeName };
    document.getElementById('grade-title').textContent = gradeName;
    
    loadSubjectsFromFirebase();
    showPage('subjects-page');
    updateBreadcrumb(gradeName);
}

// 2. اختيار المادة
function selectSubject(subjectId, subjectName) {
    currentSubject = subjectName;
    document.getElementById('subject-title').textContent = subjectName;
    document.getElementById('subject-grade').textContent = currentGrade.name;
    
    loadTeachers();
    showPage('teachers-page');
    updateBreadcrumb(`${currentGrade.name} > ${subjectName}`);
}

// Load subjects from Firebase
function loadSubjectsFromFirebase() {
    const container = document.getElementById('subjects-container');
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#666;">جاري التحميل...</div>';
    
    db.collection('subjects')
        .where('gradeId', '==', currentGrade.id)
        .get()
        .then(snapshot => {
            container.innerHTML = '';
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📚</div>
                        <div class="empty-state-text">لا يوجد مواد بعد</div>
                    </div>
                `;
                return;
            }
            
            // Show subjects from Firebase
            snapshot.forEach(doc => {
                const subject = doc.data();
                const wrapper = document.createElement('div');
                wrapper.className = 'subject-wrapper';
                wrapper.innerHTML = `
                    <button class="subject-btn" onclick="selectSubject('${doc.id}', '${subject.name}')">
                        <i class="fas fa-book subject-icon"></i>
                        <span class="subject-name">${subject.name}</span>
                    </button>
                    <button class="subject-delete-btn" onclick="deleteSubject('${doc.id}', event)"><i class="fas fa-trash"></i></button>
                `;
                container.appendChild(wrapper);
            });
        })
        .catch(error => {
            console.error('Error loading subjects:', error);
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#f44336;">حدث خطأ في التحميل</div>';
        });
}

function deleteSubject(subjectId, event) {
    event.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذه المادة؟\nسيتم حذف جميع المدرسين والمجموعات المرتبطة بها.')) {
        db.collection('subjects').doc(subjectId).delete().then(() => {
            loadSubjectsFromFirebase();
            alert('تم حذف المادة بنجاح ✓');
        }).catch(error => {
            console.error('Error deleting subject:', error);
            alert('حدث خطأ في الحذف: ' + error.message);
        });
    }
}

// 3. تحميل المدرسين
function loadTeachers() {
    const container = document.getElementById('teachers-container');
    container.innerHTML = '<div class="loading">جاري التحميل...</div>';
    
    if (!db) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-text">خطأ في الاتصال بقاعدة البيانات</div></div>';
        return;
    }
    
    db.collection('teachers')
        .where('gradeId', '==', currentGrade.id)
        .where('subject', '==', currentSubject)
        .get()
        .then(snapshot => {
            container.innerHTML = '';
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👨‍🏫</div>
                        <div class="empty-state-text">لا يوجد مدرسين بعد</div>
                    </div>
                `;
                return;
            }
            
            snapshot.forEach(doc => {
                const teacher = doc.data();
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `
                    <div class="item-icon blue"><i class="fas fa-chalkboard-teacher"></i></div>
                    <div class="item-content" onclick="selectTeacher('${doc.id}', '${teacher.name}')">
                        <div class="item-title">${teacher.name}</div>
                        <div class="item-subtitle">مدرس ${currentSubject}</div>
                        ${teacher.price ? `<div class="item-price">${teacher.price} ج.م/شهر</div>` : ''}
                    </div>
                    <div class="item-actions">
                        <button class="btn-icon edit" onclick="editTeacher('${doc.id}', event)"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon delete" onclick="deleteTeacher('${doc.id}', event)"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                container.appendChild(item);
            });
        })
        .catch(error => {
            console.error('Error loading teachers:', error);
            container.innerHTML = `<div class="empty-state"><div class="empty-state-text">خطأ: ${error.message}</div></div>`;
        });
}

// 4. اختيار مدرس
function selectTeacher(teacherId, teacherName) {
    currentTeacher = { id: teacherId, name: teacherName };
    document.getElementById('teacher-name').textContent = teacherName;
    document.getElementById('teacher-subject').textContent = `${currentSubject} - ${currentGrade.name}`;
    
    loadGroups();
    showPage('groups-page');
    updateBreadcrumb(`${currentGrade.name} > ${currentSubject} > ${teacherName}`);
}

// 5. تحميل المجموعات
function loadGroups() {
    const container = document.getElementById('groups-container');
    container.innerHTML = '<div class="loading">جاري التحميل...</div>';
    
    db.collection('groups')
        .where('teacherId', '==', currentTeacher.id)
        .get()
        .then(snapshot => {
            container.innerHTML = '';
            
            if (snapshot.empty) {
                showGroupsError(container);
                return;
            }
            
            snapshot.forEach(doc => {
                const group = doc.data();
                const item = document.createElement('div');
                item.className = 'list-item';
                
                // Handle both old format (single day) and new format (multiple days)
                const displayTitle = group.daysString || group.day || 'مجموعة';
                const displaySubtitle = group.timesString || group.time || '';
                
                item.innerHTML = `
                    <div class="item-icon purple"><i class="fas fa-clock"></i></div>
                    <div class="item-content" onclick="selectGroup('${doc.id}', '${displayTitle}', '${displaySubtitle}')">
                        <div class="item-title">${displayTitle}</div>
                        <div class="item-subtitle">${displaySubtitle}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-icon delete" onclick="deleteGroup('${doc.id}', event)"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                container.appendChild(item);
            });
        })
        .catch(error => {
            console.error('Error loading groups:', error);
            container.innerHTML = '<div class="empty-state"><div class="empty-state-text">حدث خطأ في التحميل</div></div>';
        });
}

// 6. اختيار مجموعة
function selectGroup(groupId, day, time) {
    currentGroup = { id: groupId, day: day, time: time };
    document.getElementById('group-time').textContent = time || day;
    document.getElementById('group-teacher').textContent = `${currentTeacher.name} - ${currentSubject}`;
    
    // Get teacher phone if not already loaded
    if (!currentTeacher.phone) {
        db.collection('teachers').doc(currentTeacher.id).get().then(doc => {
            if (doc.exists) {
                currentTeacher.phone = doc.data().phone;
            }
        });
    }
    
    loadStudents();
    showPage('students-page');
    updateBreadcrumb(`${currentGrade.name} > ${currentSubject} > ${currentTeacher.name} > ${day}`);
}

// 7. تحميل الطلاب
let allStudentsData = []; // Store all students for search

function loadStudents(searchQuery = '') {
    const container = document.getElementById('students-container');
    container.innerHTML = '<div class="loading">جاري التحميل...</div>';
    
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0];
    
    // Get students and today's attendance
    Promise.all([
        db.collection('students').where('groupId', '==', currentGroup.id).get(),
        db.collection('attendance').where('groupId', '==', currentGroup.id).where('dateKey', '==', dateKey).get()
    ]).then(([studentsSnapshot, attendanceSnapshot]) => {
        container.innerHTML = '';
        
        if (studentsSnapshot.empty) {
            showStudentsError(container, 'loadStudents()');
            allStudentsData = [];
            return;
        }
        
        // Map today's attendance
        const todayAttendance = {};
        attendanceSnapshot.forEach(doc => {
            const att = doc.data();
            todayAttendance[att.studentId] = att.present;
        });
        
        // Store all students with today's attendance
        allStudentsData = [];
        studentsSnapshot.forEach(doc => {
            const studentData = doc.data();
            allStudentsData.push({
                id: doc.id,
                data: {
                    ...studentData,
                    todayPresent: todayAttendance[doc.id]
                }
            });
        });
        
        // Filter students based on search query
        let filteredStudents = searchQuery 
            ? allStudentsData.filter(student => 
                student.data.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (student.data.studentNumber && student.data.studentNumber.toString().includes(searchQuery))
              )
            : allStudentsData;
        
        if (filteredStudents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-text">لا توجد نتائج للبحث</div>
                </div>
            `;
            return;
        }
        
        // Sort: not recorded first, then present, then absent
        filteredStudents.sort((a, b) => {
            const aStatus = a.data.todayPresent;
            const bStatus = b.data.todayPresent;
            
            if (aStatus === undefined && bStatus !== undefined) return -1;
            if (aStatus !== undefined && bStatus === undefined) return 1;
            if (aStatus === true && bStatus === false) return 1;
            if (aStatus === false && bStatus === true) return -1;
            return 0;
        });
        
        const currentMonth = getCurrentMonth();
        
        filteredStudents.forEach(studentObj => {
            const student = studentObj.data;
            const isPaid = student.lastPaymentMonth === currentMonth;
            const todayStatus = student.todayPresent;
            
            const item = document.createElement('div');
            item.className = 'student-item';
            
            // Add status class
            if (todayStatus === true) {
                item.classList.add('student-present');
            } else if (todayStatus === false) {
                item.classList.add('student-absent');
            }
            
            item.innerHTML = `
                <div class="student-header" onclick="selectStudent('${studentObj.id}')">
                    <div class="item-icon ${todayStatus === true ? 'green' : todayStatus === false ? 'red' : 'gray'}">
                        <i class="fas fa-user-graduate"></i>
                    </div>
                    <div class="item-content">
                        <div class="item-title">
                            ${student.studentNumber ? `<span class="student-number">#${student.studentNumber}</span> ` : ''}
                            ${student.name}
                            ${todayStatus === true ? ' <span class="status-badge present-badge">✓</span>' : ''}
                            ${todayStatus === false ? ' <span class="status-badge absent-badge">✗</span>' : ''}
                        </div>
                        ${student.phone ? `<div class="item-subtitle"><i class="fas fa-phone"></i> ${student.phone}</div>` : ''}
                        ${isPaid ? '<span class="badge-green">مدفوع</span>' : '<span class="badge-red">لم يدفع</span>'}
                    </div>
                </div>
                <div class="student-actions">
                    <button class="attendance-btn ${todayStatus === true ? 'present' : todayStatus === false ? 'absent' : 'neutral'}" 
                            onclick="markAttendance('${studentObj.id}', true, event)"
                            ${todayStatus !== undefined ? 'disabled' : ''}>
                        ✓ حاضر
                    </button>
                    <button class="attendance-btn ${todayStatus === false ? 'absent' : todayStatus === true ? 'present' : 'neutral'}" 
                            onclick="markAttendance('${studentObj.id}', false, event)"
                            ${todayStatus !== undefined ? 'disabled' : ''}>
                        ✗ غائب
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
        
        // Show statistics
        showTodayStatistics(todayAttendance);
    }).catch(error => {
        console.error('Error loading students:', error);
        container.innerHTML = '<div class="empty-state"><div class="empty-state-text">حدث خطأ في التحميل</div></div>';
    });
}

// Show today's statistics
function showTodayStatistics(todayAttendance) {
    const statsContainer = document.getElementById('today-stats');
    if (!statsContainer) return;
    
    const total = allStudentsData.length;
    const present = Object.values(todayAttendance).filter(p => p === true).length;
    const absent = Object.values(todayAttendance).filter(p => p === false).length;
    const notRecorded = total - present - absent;
    
    statsContainer.innerHTML = `
        <div class="stats-card">
            <div class="stat-item">
                <span class="stat-label">الإجمالي</span>
                <span class="stat-value">${total}</span>
            </div>
            <div class="stat-item present">
                <span class="stat-label">حاضر</span>
                <span class="stat-value">${present}</span>
            </div>
            <div class="stat-item absent">
                <span class="stat-label">غائب</span>
                <span class="stat-value">${absent}</span>
            </div>
            <div class="stat-item pending">
                <span class="stat-label">لم يسجل</span>
                <span class="stat-value">${notRecorded}</span>
            </div>
        </div>
    `;
}

// 8. تحديد الحضور
function markAttendance(studentId, isPresent, event) {
    event.stopPropagation();
    
    const today = new Date();
    const dayName = today.toLocaleDateString('ar-EG', { weekday: 'long' });
    const dateStr = today.toLocaleDateString('ar-EG', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    });
    const dateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const attendanceId = `${studentId}_${dateKey}`;
    
    // Check if already recorded today
    db.collection('attendance').doc(attendanceId).get().then(doc => {
        if (doc.exists) {
            alert('⚠️ تم تسجيل الحضور مسبقاً اليوم');
            return Promise.reject('already-recorded');
        } else {
            // Check if today is a class day
            return db.collection('groups').doc(currentGroup.id).get().then(groupDoc => {
                const group = groupDoc.data();
                let isClassDay = false;
                
                if (group.days && Array.isArray(group.days)) {
                    isClassDay = group.days.some(d => d.day === dayName);
                } else if (group.day) {
                    isClassDay = group.day === dayName;
                }
                
                if (!isClassDay) {
                    if (confirm(`⚠️ اليوم ليس يوم حصة!\nأيام الحصة: ${group.daysString || group.day}\n\nهل تريد التسجيل على أي حال؟`)) {
                        return updateAttendance(studentId, isPresent, dateKey, dateStr, dayName, attendanceId);
                    } else {
                        return Promise.reject('not-class-day');
                    }
                }
                
                return updateAttendance(studentId, isPresent, dateKey, dateStr, dayName, attendanceId);
            });
        }
    }).then(() => {
        // Reload students to show updated status
        loadStudents();
    }).catch(error => {
        if (error !== 'already-recorded' && error !== 'not-class-day') {
            console.error('Error marking attendance:', error);
            alert('حدث خطأ في تسجيل الحضور');
        }
    });
}

function updateAttendance(studentId, isPresent, dateKey, dateStr, dayName, attendanceId) {
    return db.collection('attendance').doc(attendanceId).set({
        studentId: studentId,
        groupId: currentGroup.id,
        present: isPresent,
        date: dateStr,
        dateKey: dateKey,
        dayName: dayName,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        return db.collection('students').doc(studentId).update({
            lastAttendanceDate: dateStr,
            lastAttendanceTimestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
}

// 9. اختيار طالب
function selectStudent(studentId) {
    db.collection('students').doc(studentId).get().then(doc => {
        if (doc.exists) {
            const student = doc.data();
            currentStudent = { id: studentId, ...student };
            
            document.getElementById('student-name-title').textContent = student.name;
            document.getElementById('student-group-info').textContent = `${currentGroup.day} - ${currentGroup.time}`;
            
            // Create islands layout
            const container = document.getElementById('student-profile-container');
            container.innerHTML = createProfileIslands(student);
            
            // Load grades and images
            loadGrades(studentId);
            loadExamImages(studentId);
            
            showPage('student-page');
            updateBreadcrumb(`${currentGrade.name} > ${currentSubject} > ${currentTeacher.name} > ${student.name}`);
        }
    }).catch(error => {
        console.error('Error loading student:', error);
        alert('حدث خطأ في تحميل بيانات الطالب');
    });
}

// 10. تحميل الدرجات
function loadGrades(studentId) {
    const container = document.getElementById('grades-list-island') || document.getElementById('grades-list');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;color:var(--text-secondary);font-size:13px;padding:8px;">جاري التحميل...</div>';
    
    db.collection('grades')
        .where('studentId', '==', studentId)
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            container.innerHTML = '';
            
            if (snapshot.empty) {
                container.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:8px;">لا توجد درجات بعد</div>';
                return;
            }
            
            snapshot.forEach(doc => {
                const grade = doc.data();
                const item = document.createElement('div');
                item.className = 'grade-item';
                item.innerHTML = `
                    <div class="grade-name">${grade.examName}</div>
                    <div class="grade-score">${grade.score}/${grade.total}</div>
                `;
                container.appendChild(item);
            });
        })
        .catch(error => {
            console.error('Error loading grades:', error);
            container.innerHTML = '<div style="text-align:center;color:var(--danger-color);font-size:13px;padding:8px;">خطأ في التحميل</div>';
        });
}

// Modals
function showAddTeacherModal() {
    document.getElementById('add-teacher-modal').classList.add('active');
}

function showAddGroupModal() {
    document.getElementById('add-group-modal').classList.add('active');
}

function showAddStudentModal() {
    document.getElementById('add-student-modal').classList.add('active');
}

function showAddGradeModal() {
    document.getElementById('add-grade-modal').classList.add('active');
}

function showAddSubjectModal() {
    document.getElementById('add-subject-modal').classList.add('active');
}

function addNewSubject() {
    const name = document.getElementById('subject-name-input').value.trim();
    
    if (!name) {
        alert('من فضلك أدخل اسم المادة');
        return;
    }
    
    if (!db) {
        alert('خطأ في الاتصال بقاعدة البيانات');
        return;
    }
    
    db.collection('subjects').add({
        name: name,
        gradeId: currentGrade.id,
        gradeName: currentGrade.name,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('subject-name-input').value = '';
        closeModal();
        loadSubjectsFromFirebase();
        alert('تم إضافة المادة بنجاح ✓');
    }).catch(error => {
        console.error('Error adding subject:', error);
        alert('حدث خطأ في الإضافة: ' + error.message);
    });
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
}

// Add Functions
function addTeacher() {
    const name = document.getElementById('teacher-name-input').value.trim();
    const price = document.getElementById('teacher-price-input').value;
    const phone = document.getElementById('teacher-phone-input').value.trim();
    
    if (!name) {
        alert('من فضلك أدخل اسم المدرس');
        return;
    }
    
    if (!phone) {
        alert('من فضلك أدخل رقم هاتف المدرس');
        return;
    }
    
    if (!db) {
        alert('خطأ في الاتصال بقاعدة البيانات. تأكد من إعدادات Firebase.');
        return;
    }
    
    db.collection('teachers').add({
        name: name,
        price: price ? parseInt(price) : 0,
        phone: phone,
        gradeId: currentGrade.id,
        gradeName: currentGrade.name,
        subject: currentSubject,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('teacher-name-input').value = '';
        document.getElementById('teacher-price-input').value = '';
        document.getElementById('teacher-phone-input').value = '';
        closeModal();
        loadTeachers();
        alert('تم إضافة المدرس بنجاح ✓');
    }).catch(error => {
        console.error('Error adding teacher:', error);
        alert('حدث خطأ في الإضافة: ' + error.message + '\n\nتأكد من:\n1. تفعيل Firestore في Firebase Console\n2. صحة بيانات Firebase في app.js');
    });
}

function toggleDayTime(checkbox) {
    const day = checkbox.value;
    const timeInput = document.querySelector(`.day-time-input[data-day="${day}"]`);
    const periodSelect = document.querySelector(`.day-period-select[data-day="${day}"]`);
    timeInput.disabled = !checkbox.checked;
    periodSelect.disabled = !checkbox.checked;
    if (!checkbox.checked) {
        timeInput.value = '';
        periodSelect.value = 'ص';
    }
}

function convertTo12Hour(time24, period) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let hour = parseInt(hours);
    
    if (hour === 0) hour = 12;
    else if (hour > 12) hour = hour - 12;
    
    return `${hour}:${minutes} ${period}`;
}

function addGroup() {
    if (!db) {
        alert('خطأ في الاتصال بقاعدة البيانات');
        return;
    }
    
    // Collect selected days and times
    const selectedDays = [];
    document.querySelectorAll('.day-checkbox input[type="checkbox"]:checked').forEach(checkbox => {
        const day = checkbox.value;
        const timeInput = document.querySelector(`.day-time-input[data-day="${day}"]`);
        const periodSelect = document.querySelector(`.day-period-select[data-day="${day}"]`);
        const time24 = timeInput.value;
        const period = periodSelect.value;
        
        if (time24) {
            const time12 = convertTo12Hour(time24, period);
            selectedDays.push({ day: day, time: time12 });
        }
    });
    
    if (selectedDays.length === 0) {
        alert('من فضلك اختر يوم واحد على الأقل مع الموعد');
        return;
    }
    
    // Create ONE group with multiple days
    const daysString = selectedDays.map(d => d.day).join(' - ');
    const timesString = selectedDays.map(d => `${d.day}: ${d.time}`).join(' | ');
    
    db.collection('groups').add({
        teacherId: currentTeacher.id,
        teacherName: currentTeacher.name,
        subject: currentSubject,
        gradeId: currentGrade.id,
        gradeName: currentGrade.name,
        days: selectedDays,
        daysString: daysString,
        timesString: timesString,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        // Reset form
        document.querySelectorAll('.day-checkbox input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('.day-time-input').forEach(input => {
            input.value = '';
            input.disabled = true;
        });
        document.querySelectorAll('.day-period-select').forEach(select => {
            select.value = 'ص';
            select.disabled = true;
        });
        closeModal();
        loadGroups();
        alert('تم إضافة المجموعة بنجاح ✓');
    }).catch(error => {
        console.error('Error adding group:', error);
        alert('حدث خطأ في الإضافة: ' + error.message);
    });
}

function addStudent() {
    const name = document.getElementById('student-name-input').value.trim();
    const phone = document.getElementById('student-phone-input').value.trim();
    const parentPhone = document.getElementById('student-parent-input').value.trim();
    const notes = document.getElementById('student-notes-input').value.trim();
    
    if (!name) {
        alert('من فضلك أدخل اسم الطالب');
        return;
    }
    
    if (!db) {
        alert('خطأ في الاتصال بقاعدة البيانات');
        return;
    }
    
    // Get the next student number
    db.collection('students')
        .orderBy('studentNumber', 'desc')
        .limit(1)
        .get()
        .then(snapshot => {
            let nextNumber = 1;
            if (!snapshot.empty) {
                const lastStudent = snapshot.docs[0].data();
                nextNumber = (lastStudent.studentNumber || 0) + 1;
            }
            
            return db.collection('students').add({
                studentNumber: nextNumber,
                name: name,
                phone: phone,
                parentPhone: parentPhone,
                notes: notes,
                groupId: currentGroup.id,
                teacherId: currentTeacher.id,
                subject: currentSubject,
                gradeId: currentGrade.id,
                paid: false,
                absences: 0,
                present: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            document.getElementById('student-name-input').value = '';
            document.getElementById('student-phone-input').value = '';
            document.getElementById('student-parent-input').value = '';
            document.getElementById('student-notes-input').value = '';
            closeModal();
            loadStudents();
            alert('تم إضافة الطالب بنجاح ✓');
    }).catch(error => {
        console.error('Error adding student:', error);
        alert('حدث خطأ في الإضافة: ' + error.message);
    });
}

function addGrade() {
    const examName = document.getElementById('exam-name-input').value.trim();
    const score = document.getElementById('exam-grade-input').value;
    const total = document.getElementById('exam-total-input').value;
    
    if (!examName || !score || !total) {
        alert('من فضلك أكمل جميع البيانات');
        return;
    }
    
    if (!db) {
        alert('خطأ في الاتصال بقاعدة البيانات');
        return;
    }
    
    db.collection('grades').add({
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        examName: examName,
        score: parseInt(score),
        total: parseInt(total),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('exam-name-input').value = '';
        document.getElementById('exam-grade-input').value = '';
        document.getElementById('exam-total-input').value = '';
        closeModal();
        loadGrades(currentStudent.id);
        alert('تم إضافة الدرجة بنجاح ✓');
    }).catch(error => {
        console.error('Error adding grade:', error);
        alert('حدث خطأ في الإضافة: ' + error.message);
    });
}

// Edit Functions
let editingTeacherId = null;
let editingStudentId = null;

function editTeacher(teacherId, event) {
    event.stopPropagation();
    editingTeacherId = teacherId;
    
    db.collection('teachers').doc(teacherId).get().then(doc => {
        if (doc.exists) {
            const teacher = doc.data();
            document.getElementById('edit-teacher-name').value = teacher.name;
            document.getElementById('edit-teacher-price').value = teacher.price || '';
            document.getElementById('edit-teacher-phone').value = teacher.phone || '';
            document.getElementById('edit-teacher-modal').classList.add('active');
        }
    });
}

function saveTeacherEdit() {
    const name = document.getElementById('edit-teacher-name').value.trim();
    const price = document.getElementById('edit-teacher-price').value;
    const phone = document.getElementById('edit-teacher-phone').value.trim();
    
    if (!name) {
        alert('من فضلك أدخل اسم المدرس');
        return;
    }
    
    if (!phone) {
        alert('من فضلك أدخل رقم هاتف المدرس');
        return;
    }
    
    db.collection('teachers').doc(editingTeacherId).update({
        name: name,
        price: price ? parseInt(price) : 0,
        phone: phone
    }).then(() => {
        closeModal();
        loadTeachers();
        alert('تم تحديث البيانات بنجاح ✓');
    }).catch(error => {
        console.error('Error updating teacher:', error);
        alert('حدث خطأ في التحديث: ' + error.message);
    });
}

function showEditStudentModal() {
    editingStudentId = currentStudent.id;
    document.getElementById('edit-student-name').value = currentStudent.name;
    document.getElementById('edit-student-phone').value = currentStudent.phone || '';
    document.getElementById('edit-student-parent').value = currentStudent.parentPhone || '';
    document.getElementById('edit-student-notes').value = currentStudent.notes || '';
    document.getElementById('edit-student-modal').classList.add('active');
}

function saveStudentEdit() {
    const name = document.getElementById('edit-student-name').value.trim();
    const phone = document.getElementById('edit-student-phone').value.trim();
    const parentPhone = document.getElementById('edit-student-parent').value.trim();
    const notes = document.getElementById('edit-student-notes').value.trim();
    
    if (!name) {
        alert('من فضلك أدخل اسم الطالب');
        return;
    }
    
    db.collection('students').doc(editingStudentId).update({
        name: name,
        phone: phone,
        parentPhone: parentPhone,
        notes: notes
    }).then(() => {
        closeModal();
        selectStudent(editingStudentId);
        alert('تم تحديث البيانات بنجاح ✓');
    }).catch(error => {
        console.error('Error updating student:', error);
        alert('حدث خطأ في التحديث: ' + error.message);
    });
}

// Delete Functions
function deleteTeacher(teacherId, event) {
    event.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذا المدرس؟')) {
        db.collection('teachers').doc(teacherId).delete().then(() => {
            loadTeachers();
        }).catch(error => {
            console.error('Error deleting teacher:', error);
            alert('حدث خطأ في الحذف');
        });
    }
}

function deleteGroup(groupId, event) {
    event.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذه المجموعة؟')) {
        db.collection('groups').doc(groupId).delete().then(() => {
            loadGroups();
        }).catch(error => {
            console.error('Error deleting group:', error);
            alert('حدث خطأ في الحذف');
        });
    }
}

// Payment Modal
function showPaymentModal() {
    const currentMonth = getCurrentMonth();
    document.getElementById('payment-modal-title').textContent = `تسجيل فلوس شهر ${currentMonth}`;
    document.getElementById('payment-modal').classList.add('active');
}

function recordPayment() {
    const currentMonth = getCurrentMonth();
    
    // Get teacher price
    db.collection('teachers').doc(currentTeacher.id).get().then(teacherDoc => {
        const teacherPrice = teacherDoc.data().price || 0;
        
        return db.collection('students').doc(currentStudent.id).update({
            lastPaymentMonth: currentMonth,
            lastPaymentAmount: teacherPrice,
            lastPaymentDate: firebase.firestore.FieldValue.serverTimestamp()
        });
    }).then(() => {
        // Get teacher price again for payment history
        return db.collection('teachers').doc(currentTeacher.id).get();
    }).then(teacherDoc => {
        const teacherPrice = teacherDoc.data().price || 0;
        
        // Record in payments history
        return db.collection('payments').add({
            studentId: currentStudent.id,
            studentName: currentStudent.name,
            month: currentMonth,
            amount: teacherPrice,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }).then(() => {
        closeModal();
        selectStudent(currentStudent.id);
        alert('تم تسجيل الدفعة بنجاح ✓');
    }).catch(error => {
        console.error('Error recording payment:', error);
        alert('حدث خطأ في التسجيل: ' + error.message);
    });
}

// WhatsApp - Send to Parent
function sendWhatsAppMessage() {
    if (!currentStudent.parentPhone) {
        alert('لا يوجد رقم لولي الأمر');
        return;
    }
    
    const currentMonth = getCurrentMonth();
    const isPaid = currentStudent.lastPaymentMonth === currentMonth;
    
    // Get attendance records and grades
    Promise.all([
        db.collection('attendance')
            .where('studentId', '==', currentStudent.id)
            .get(),
        db.collection('grades')
            .where('studentId', '==', currentStudent.id)
            .get()
    ]).then(([attendanceSnapshot, gradesSnapshot]) => {
        let message = `السلام عليكم ورحمة الله وبركاته\n\nتقرير الطالب/ة: ${currentStudent.name}\n`;
        message += `${currentStudent.studentNumber ? `#${currentStudent.studentNumber}` : ''}\n\n`;
        message += `━━━━━━━━━━━━━━━━\n`;
        message += `المادة: ${currentSubject}\n`;
        message += `المدرس: ${currentTeacher.name}\n`;
        message += `المجموعة: ${currentGroup.day}\n`;
        message += `حالة الدفع: ${isPaid ? 'مدفوع ✓' : 'لم يدفع ✗'}\n\n`;
        
        // Attendance table
        if (!attendanceSnapshot.empty) {
            // Sort records
            const records = [];
            attendanceSnapshot.forEach(doc => {
                records.push(doc.data());
            });
            records.sort((a, b) => (b.dateKey || '').localeCompare(a.dateKey || ''));
            
            message += `📅 سجل الحضور (آخر 10 حصص):\n`;
            records.slice(0, 10).forEach(record => {
                const status = record.present ? '✓' : '✗';
                message += `${status} ${record.dayName} - ${record.date.split('،')[0]}\n`;
            });
            message += `\n`;
        }
        
        // Grades
        if (!gradesSnapshot.empty) {
            message += `📊 الدرجات:\n`;
            gradesSnapshot.forEach(doc => {
                const grade = doc.data();
                message += `• ${grade.examName}: ${grade.score}/${grade.total}\n`;
            });
            message += `\n`;
        }
        
        message += `━━━━━━━━━━━━━━━━\n\n`;
        
        // Add share link
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/share.html?id=${currentStudent.id}`;
        message += `🔗 لمتابعة بيانات الطالب بشكل مباشر:\n`;
        message += `${shareUrl}\n\n`;
        message += `📊 يحتوي الرابط على:\n`;
        message += `• الدرجات والامتحانات\n`;
        message += `• صور الامتحانات\n`;
        message += `• سجل الحضور والغياب الكامل\n`;
        message += `• حالة الدفع\n`;
        message += `• تحديثات مباشرة 🔴\n\n`;
        message += `━━━━━━━━━━━━━━━━\n`;
        message += `مع تحيات سنتر التميز التعليمي`;
        
        // Format phone number
        let phone = currentStudent.parentPhone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) {
            phone = '2' + phone;
        } else if (!phone.startsWith('2')) {
            phone = '2' + phone;
        }
        
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }).catch(error => {
        console.error('Error:', error);
        alert('حدث خطأ في جمع البيانات: ' + error.message);
    });
}

// Send Student Info via WhatsApp
function sendStudentInfo() {
    if (!currentStudent.parentPhone) {
        alert('لا يوجد رقم لولي الأمر');
        return;
    }
    
    let message = `السلام عليكم ورحمة الله وبركاته\n\n📋 بيانات الطالب\n\n`;
    message += `الاسم: ${currentStudent.name}\n`;
    message += `${currentStudent.studentNumber ? `الرقم: #${currentStudent.studentNumber}\n` : ''}`;
    message += `المادة: ${currentSubject}\n`;
    message += `المدرس: ${currentTeacher.name}\n`;
    message += `المجموعة: ${currentGroup.day}\n`;
    message += `الموعد: ${currentGroup.time}\n\n`;
    
    // Add share link
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/share.html?id=${currentStudent.id}`;
    message += `🔗 رابط متابعة الطالب:\n`;
    message += `${shareUrl}\n\n`;
    message += `📊 يحتوي على:\n`;
    message += `• الدرجات وصور الامتحانات\n`;
    message += `• سجل الحضور والغياب\n`;
    message += `• حالة الدفع\n`;
    message += `• تحديثات لحظية 🔴\n\n`;
    
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `مع تحيات سنتر التميز التعليمي`;
    
    // Format phone number
    let phone = currentStudent.parentPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
        phone = '2' + phone;
    } else if (!phone.startsWith('2')) {
        phone = '2' + phone;
    }
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// Send Today's Statistics to Teacher
function sendTodayStatistics() {
    if (!currentTeacher || !currentTeacher.phone) {
        // Get teacher phone
        db.collection('teachers').doc(currentTeacher.id).get().then(doc => {
            if (doc.exists) {
                currentTeacher.phone = doc.data().phone;
                sendTodayStatisticsMessage();
            } else {
                alert('لا يوجد رقم هاتف للمدرس');
            }
        });
    } else {
        sendTodayStatisticsMessage();
    }
}

function sendTodayStatisticsMessage() {
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0];
    const dateStr = today.toLocaleDateString('ar-EG', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    });
    
    // Get today's attendance and grades
    Promise.all([
        db.collection('students').where('groupId', '==', currentGroup.id).get(),
        db.collection('attendance').where('groupId', '==', currentGroup.id).where('dateKey', '==', dateKey).get(),
        db.collection('grades').get()
    ]).then(([studentsSnapshot, attendanceSnapshot, gradesSnapshot]) => {
        const studentsMap = {};
        const currentMonth = getCurrentMonth();
        
        studentsSnapshot.forEach(doc => {
            const student = doc.data();
            studentsMap[doc.id] = {
                id: doc.id,
                number: student.studentNumber,
                name: student.name,
                paid: student.lastPaymentMonth === currentMonth,
                todayStatus: null,
                grades: []
            };
        });
        
        // Map today's attendance
        attendanceSnapshot.forEach(doc => {
            const att = doc.data();
            if (studentsMap[att.studentId]) {
                studentsMap[att.studentId].todayStatus = att.present;
            }
        });
        
        // Map grades (today's exams only if available)
        gradesSnapshot.forEach(doc => {
            const grade = doc.data();
            if (studentsMap[grade.studentId]) {
                studentsMap[grade.studentId].grades.push(grade);
            }
        });
        
        // Build message
        let message = `📅 *تقرير حضور اليوم*\n\n`;
        message += `👨‍🏫 ${currentTeacher.name}\n`;
        message += `📚 ${currentSubject} - ${currentGrade.name}\n`;
        message += `🕒 ${currentGroup.daysString || currentGroup.day}\n`;
        message += `📆 ${dateStr}\n\n`;
        message += `━━━━━━━━━━━━━━━━\n\n`;
        
        const presentStudents = Object.values(studentsMap).filter(s => s.todayStatus === true);
        const absentStudents = Object.values(studentsMap).filter(s => s.todayStatus === false);
        const notRecorded = Object.values(studentsMap).filter(s => s.todayStatus === null);
        
        if (presentStudents.length > 0) {
            message += `✅ *حاضرين (${presentStudents.length}):*\n`;
            presentStudents.forEach(s => {
                message += `${s.number ? `#${s.number}` : '•'} ${s.name}`;
                message += ` ${s.paid ? '💰' : '❌'}`;
                message += `\n`;
            });
            message += `\n`;
        }
        
        if (absentStudents.length > 0) {
            message += `❌ *غائبين (${absentStudents.length}):*\n`;
            absentStudents.forEach(s => {
                message += `${s.number ? `#${s.number}` : '•'} ${s.name}\n`;
            });
            message += `\n`;
        }
        
        if (notRecorded.length > 0) {
            message += `⏳ *لم يسجل (${notRecorded.length}):*\n`;
            notRecorded.forEach(s => {
                message += `${s.number ? `#${s.number}` : '•'} ${s.name}\n`;
            });
            message += `\n`;
        }
        
        message += `━━━━━━━━━━━━━━━━\n`;
        message += `📊 الإجمالي: ${Object.keys(studentsMap).length} طالب\n`;
        message += `✅ حاضر: ${presentStudents.length}\n`;
        message += `❌ غائب: ${absentStudents.length}\n`;
        message += `💰 دفعوا: ${Object.values(studentsMap).filter(s => s.paid).length}\n\n`;
        
        message += `━━━━━━━━━━━━━━━━\n\n`;
        
        // Add teacher stats link
        const baseUrl = window.location.origin;
        const statsUrl = `${baseUrl}/teacher-stats.html?group=${currentGroup.id}`;
        message += `📊 لعرض إحصائيات شاملة لجميع الطلاب:\n`;
        message += `${statsUrl}\n\n`;
        message += `يحتوي على:\n`;
        message += `• قائمة كاملة بجميع الطلاب\n`;
        message += `• حالة الحضور والغياب لكل طالب\n`;
        message += `• حالة الدفع\n`;
        message += `• روابط مباشرة لبيانات كل طالب\n`;
        message += `• تحديثات مباشرة 🔴\n\n`;
        
        message += `مع تحيات سنتر التميز التعليمي`;
        
        // Format phone number
        let phone = currentTeacher.phone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) {
            phone = '2' + phone;
        } else if (!phone.startsWith('2')) {
            phone = '2' + phone;
        }
        
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }).catch(error => {
        console.error('Error:', error);
        alert('حدث خطأ في جمع البيانات');
    });
}

// Send Month Statistics to Teacher
function sendMonthStatistics() {
    if (!currentTeacher || !currentTeacher.phone) {
        // Get teacher phone
        db.collection('teachers').doc(currentTeacher.id).get().then(doc => {
            if (doc.exists) {
                currentTeacher.phone = doc.data().phone;
                sendMonthStatisticsMessage();
            } else {
                alert('لا يوجد رقم هاتف للمدرس');
            }
        });
    } else {
        sendMonthStatisticsMessage();
    }
}

function sendMonthStatisticsMessage() {
    const currentMonth = getCurrentMonth();
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth();
    
    // Get first and last day of current month
    const firstDay = new Date(currentYear, currentMonthNum, 1).toISOString().split('T')[0];
    const lastDay = new Date(currentYear, currentMonthNum + 1, 0).toISOString().split('T')[0];
    
    // Get all data for the month
    Promise.all([
        db.collection('students').where('groupId', '==', currentGroup.id).get(),
        db.collection('attendance').where('groupId', '==', currentGroup.id).get(),
        db.collection('grades').get()
    ]).then(([studentsSnapshot, attendanceSnapshot, gradesSnapshot]) => {
        const studentsMap = {};
        
        studentsSnapshot.forEach(doc => {
            const student = doc.data();
            studentsMap[doc.id] = {
                id: doc.id,
                number: student.studentNumber,
                name: student.name,
                paid: student.lastPaymentMonth === currentMonth,
                attendance: { present: 0, absent: 0 },
                grades: []
            };
        });
        
        // Count attendance for this month
        attendanceSnapshot.forEach(doc => {
            const att = doc.data();
            if (studentsMap[att.studentId] && att.dateKey >= firstDay && att.dateKey <= lastDay) {
                if (att.present) {
                    studentsMap[att.studentId].attendance.present++;
                } else {
                    studentsMap[att.studentId].attendance.absent++;
                }
            }
        });
        
        // Map grades
        gradesSnapshot.forEach(doc => {
            const grade = doc.data();
            if (studentsMap[grade.studentId]) {
                studentsMap[grade.studentId].grades.push(grade);
            }
        });
        
        // Build message
        let message = `📊 *تقرير شهر ${currentMonth}*\n\n`;
        message += `👨‍🏫 ${currentTeacher.name}\n`;
        message += `📚 ${currentSubject} - ${currentGrade.name}\n`;
        message += `🕒 ${currentGroup.daysString || currentGroup.day}\n\n`;
        message += `━━━━━━━━━━━━━━━━\n\n`;
        
        message += `👥 *تفاصيل الطلاب:*\n\n`;
        Object.values(studentsMap).forEach((student, index) => {
            message += `${index + 1}. ${student.number ? `#${student.number}` : ''} *${student.name}*\n`;
            message += `📅 حضور: ${student.attendance.present} | غياب: ${student.attendance.absent}\n`;
            message += `💰 ${student.paid ? 'مدفوع ✓' : 'لم يدفع ✗'}\n\n`;
        });
        
        message += `━━━━━━━━━━━━━━━━\n`;
        message += `📊 الإجمالي: ${Object.keys(studentsMap).length} طالب\n`;
        message += `💰 دفعوا: ${Object.values(studentsMap).filter(s => s.paid).length}\n`;
        message += `❌ لم يدفعوا: ${Object.values(studentsMap).filter(s => !s.paid).length}\n\n`;
        
        message += `━━━━━━━━━━━━━━━━\n\n`;
        
        // Add teacher stats link
        const baseUrl = window.location.origin;
        const statsUrl = `${baseUrl}/teacher-stats.html?group=${currentGroup.id}`;
        message += `📊 لعرض إحصائيات شاملة لجميع الطلاب:\n`;
        message += `${statsUrl}\n\n`;
        message += `يحتوي على:\n`;
        message += `• قائمة كاملة بجميع الطلاب\n`;
        message += `• حالة الحضور والغياب لكل طالب\n`;
        message += `• حالة الدفع\n`;
        message += `• روابط مباشرة لبيانات كل طالب\n`;
        message += `• تحديثات مباشرة 🔴\n\n`;
        
        message += `مع تحيات سنتر التميز التعليمي`;
        
        // Format phone number
        let phone = currentTeacher.phone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) {
            phone = '2' + phone;
        } else if (!phone.startsWith('2')) {
            phone = '2' + phone;
        }
        
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }).catch(error => {
        console.error('Error:', error);
        alert('حدث خطأ في جمع البيانات');
    });
}

// WhatsApp - Send Statistics to Teacher (OLD - Keep for compatibility)
function sendTeacherStatistics() {
    if (!currentTeacher || !currentTeacher.phone) {
        alert('لا يوجد رقم هاتف للمدرس');
        return;
    }
    
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0];
    
    // Get all students and their attendance for today
    db.collection('students')
        .where('groupId', '==', currentGroup.id)
        .get()
        .then(studentsSnapshot => {
            if (studentsSnapshot.empty) {
                alert('لا يوجد طلاب في هذه المجموعة');
                return;
            }
            
            const currentMonth = getCurrentMonth();
            const studentIds = [];
            const studentsMap = {};
            
            studentsSnapshot.forEach(doc => {
                const student = doc.data();
                studentIds.push(doc.id);
                studentsMap[doc.id] = {
                    id: doc.id,
                    number: student.studentNumber,
                    name: student.name,
                    paid: student.lastPaymentMonth === currentMonth,
                    grades: []
                };
            });
            
            // Get today's attendance and all grades
            return Promise.all([
                db.collection('attendance')
                    .where('dateKey', '==', dateKey)
                    .where('groupId', '==', currentGroup.id)
                    .get(),
                db.collection('grades')
                    .where('studentId', 'in', studentIds.slice(0, 10))
                    .get()
            ]).then(([attendanceSnapshot, gradesSnapshot]) => {
                // Process attendance
                const todayAbsent = [];
                const todayPresent = [];
                
                attendanceSnapshot.forEach(doc => {
                    const record = doc.data();
                    const student = studentsMap[record.studentId];
                    if (student) {
                        if (record.present) {
                            todayPresent.push(student.name);
                        } else {
                            todayAbsent.push(student.name);
                        }
                    }
                });
                
                // Process grades
                gradesSnapshot.forEach(doc => {
                    const grade = doc.data();
                    if (studentsMap[grade.studentId]) {
                        studentsMap[grade.studentId].grades.push(grade);
                    }
                });
                
                // Build message
                let message = `📊 تقرير المجموعة\n`;
                message += `👨‍🏫 ${currentTeacher.name}\n`;
                message += `📚 ${currentSubject} - ${currentGrade.name}\n`;
                message += `🕒 ${currentGroup.day}\n`;
                message += `📅 ${currentMonth}\n\n`;
                message += `━━━━━━━━━━━━━━━━\n\n`;
                
                // Today's attendance
                if (todayAbsent.length > 0 || todayPresent.length > 0) {
                    message += `📅 حضور اليوم:\n`;
                    if (todayPresent.length > 0) {
                        message += `✓ حاضرين (${todayPresent.length}):\n`;
                        todayPresent.forEach(name => message += `  • ${name}\n`);
                    }
                    if (todayAbsent.length > 0) {
                        message += `✗ غائبين (${todayAbsent.length}):\n`;
                        todayAbsent.forEach(name => message += `  • ${name}\n`);
                    }
                    message += `\n`;
                }
                
                // Students details
                message += `👥 *تفاصيل الطلاب:*\n\n`;
                Object.values(studentsMap).forEach((student, index) => {
                    message += `${index + 1}. ${student.number ? `#${student.number}` : ''} *${student.name}*\n`;
                    message += `💰 ${student.paid ? 'مدفوع ✓' : 'لم يدفع ✗'}\n\n`;
                });
                
                message += `━━━━━━━━━━━━━━━━\n`;
                message += `📊 الإجمالي: ${Object.keys(studentsMap).length} طالب\n`;
                message += `💰 دفعوا: ${Object.values(studentsMap).filter(s => s.paid).length}\n`;
                message += `❌ لم يدفعوا: ${Object.values(studentsMap).filter(s => !s.paid).length}\n\n`;
                
                message += `━━━━━━━━━━━━━━━━\n\n`;
                
                // Add teacher stats link
                const baseUrl = window.location.origin;
                const statsUrl = `${baseUrl}/teacher-stats.html?group=${currentGroup.id}`;
                message += `📊 لعرض إحصائيات شاملة لجميع الطلاب:\n`;
                message += `${statsUrl}\n\n`;
                message += `يحتوي على:\n`;
                message += `• قائمة كاملة بجميع الطلاب\n`;
                message += `• حالة الحضور والغياب لكل طالب\n`;
                message += `• حالة الدفع\n`;
                message += `• روابط مباشرة لبيانات كل طالب\n`;
                message += `• تحديثات مباشرة 🔴\n\n`;
                
                message += `مع تحيات سنتر التميز التعليمي`;
                
                // Format phone number
                let phone = currentTeacher.phone.replace(/[^0-9]/g, '');
                if (phone.startsWith('0')) {
                    phone = '2' + phone;
                } else if (!phone.startsWith('2')) {
                    phone = '2' + phone;
                }
                
                const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
            });
        })
        .catch(error => {
            console.error('Error:', error);
            alert('حدث خطأ في جمع البيانات');
        });
}

// Search Functions
document.addEventListener('DOMContentLoaded', () => {
    // Global search
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
        globalSearch.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length < 1) {
                document.getElementById('global-search-results').innerHTML = '';
                return;
            }
            performGlobalSearch(query);
        });
    }
    
    // Subject search
    const subjectSearch = document.getElementById('subject-search');
    if (subjectSearch) {
        subjectSearch.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length < 1) {
                document.getElementById('subject-search-results').innerHTML = '';
                return;
            }
            performSubjectSearch(query);
        });
    }
    
    // Students search (in group)
    const studentsSearch = document.getElementById('students-search');
    if (studentsSearch) {
        studentsSearch.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            loadStudents(query);
        });
    }
});

function performGlobalSearch(query) {
    const resultsContainer = document.getElementById('global-search-results');
    resultsContainer.innerHTML = '<div style="text-align:center;padding:10px;color:#666;">جاري البحث...</div>';
    
    const results = [];
    const queryLower = query.toLowerCase();
    const queryStr = query.toString();
    
    // Search students
    db.collection('students').get().then(snapshot => {
        snapshot.forEach(doc => {
            const student = doc.data();
            const nameLower = student.name.toLowerCase();
            const studentNumberStr = student.studentNumber ? student.studentNumber.toString() : '';
            
            // Check name match
            const nameMatch = nameLower.includes(queryLower);
            
            // Check number match - search anywhere in the number
            const numberMatch = studentNumberStr.includes(queryStr);
            
            if (nameMatch || numberMatch) {
                // Prioritize exact number matches
                if (numberMatch && studentNumberStr === queryStr) {
                    results.unshift({
                        type: 'student',
                        id: doc.id,
                        name: `#${student.studentNumber} ${student.name}`,
                        details: `${student.subject} - ${student.gradeName}`,
                        icon: '👤',
                        data: student
                    });
                } else {
                    results.push({
                        type: 'student',
                        id: doc.id,
                        name: student.studentNumber ? `#${student.studentNumber} ${student.name}` : student.name,
                        details: `${student.subject} - ${student.gradeName}`,
                        icon: '👤',
                        data: student
                    });
                }
            }
        });
        
        // Search teachers
        return db.collection('teachers').get();
    }).then(snapshot => {
        snapshot.forEach(doc => {
            const teacher = doc.data();
            if (teacher.name.toLowerCase().includes(query)) {
                results.push({
                    type: 'teacher',
                    id: doc.id,
                    name: teacher.name,
                    details: `${teacher.subject} - ${teacher.gradeName}`,
                    icon: '👨‍🏫',
                    data: teacher
                });
            }
        });
        
        // Search subjects
        return db.collection('subjects').get();
    }).then(snapshot => {
        snapshot.forEach(doc => {
            const subject = doc.data();
            if (subject.name.toLowerCase().includes(query)) {
                results.push({
                    type: 'subject',
                    id: doc.id,
                    name: subject.name,
                    details: subject.gradeName,
                    icon: '📚',
                    data: subject
                });
            }
        });
        
        displaySearchResults(results, resultsContainer, 'global');
    }).catch(error => {
        console.error('Search error:', error);
        resultsContainer.innerHTML = '<div style="text-align:center;padding:10px;color:#f44336;">حدث خطأ في البحث</div>';
    });
}

function performSubjectSearch(query) {
    if (!currentGrade || !currentSubject) return;
    
    const resultsContainer = document.getElementById('subject-search-results');
    resultsContainer.innerHTML = '<div style="text-align:center;padding:10px;color:#666;">جاري البحث...</div>';
    
    db.collection('students')
        .where('gradeId', '==', currentGrade.id)
        .where('subject', '==', currentSubject)
        .get()
        .then(snapshot => {
            const results = [];
            snapshot.forEach(doc => {
                const student = doc.data();
                if (student.name.toLowerCase().includes(query) ||
                    (student.studentNumber && student.studentNumber.toString().includes(query))) {
                    results.push({
                        type: 'student',
                        id: doc.id,
                        name: student.studentNumber ? `#${student.studentNumber} ${student.name}` : student.name,
                        details: `${student.teacherName || 'مدرس غير محدد'}`,
                        data: student
                    });
                }
            });
            
            displaySearchResults(results, resultsContainer, 'subject');
        });
}

function displaySearchResults(results, container, searchType) {
    if (results.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:10px;color:#666;">لا توجد نتائج</div>';
        return;
    }
    
    container.innerHTML = '';
    results.forEach((result, index) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        
        // Store result data in a global variable for access
        if (!window.searchResultsData) window.searchResultsData = {};
        const resultId = `search_${searchType}_${index}`;
        window.searchResultsData[resultId] = result;
        
        // Add quick attendance buttons for students in global search
        if (result.type === 'student' && searchType === 'global') {
            const paymentIndicator = getPaymentIndicator(result.data);
            
            const iconDiv = document.createElement('div');
            iconDiv.className = 'search-result-icon';
            iconDiv.textContent = result.icon;
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'search-result-info';
            infoDiv.onclick = () => handleSearchResultClick(result);
            infoDiv.innerHTML = `
                <div class="search-result-name">${paymentIndicator} ${result.name}</div>
                <div class="search-result-details">${result.details}</div>
            `;
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'search-quick-actions';
            
            const presentBtn = document.createElement('button');
            presentBtn.className = 'quick-btn present';
            presentBtn.title = 'حضور سريع';
            presentBtn.innerHTML = '<i class="fas fa-check"></i>';
            presentBtn.onclick = (e) => quickAttendance(result.id, true, result.data, e);
            
            const absentBtn = document.createElement('button');
            absentBtn.className = 'quick-btn absent';
            absentBtn.title = 'غياب سريع';
            absentBtn.innerHTML = '<i class="fas fa-times"></i>';
            absentBtn.onclick = (e) => quickAttendance(result.id, false, result.data, e);
            
            actionsDiv.appendChild(presentBtn);
            actionsDiv.appendChild(absentBtn);
            
            item.appendChild(iconDiv);
            item.appendChild(infoDiv);
            item.appendChild(actionsDiv);
        } else {
            item.onclick = () => handleSearchResultClick(result);
            
            const iconDiv = document.createElement('div');
            iconDiv.className = 'search-result-icon';
            iconDiv.textContent = result.icon;
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'search-result-info';
            infoDiv.innerHTML = `
                <div class="search-result-name">${result.name}</div>
                <div class="search-result-details">${result.details}</div>
            `;
            
            item.appendChild(iconDiv);
            item.appendChild(infoDiv);
        }
        
        container.appendChild(item);
    });
}

function handleSearchResultClick(result) {
    if (result.type === 'student') {
        // Navigate to student
        db.collection('groups').doc(result.data.groupId).get().then(groupDoc => {
            if (groupDoc.exists) {
                const group = groupDoc.data();
                currentGroup = { id: result.data.groupId, day: group.day, time: group.time };
                currentTeacher = { id: result.data.teacherId, name: result.data.teacherName };
                currentSubject = result.data.subject;
                currentGrade = { id: result.data.gradeId, name: result.data.gradeName };
                selectStudent(result.id);
            }
        });
    } else if (result.type === 'teacher') {
        // Navigate to teacher
        currentGrade = { id: result.data.gradeId, name: result.data.gradeName };
        currentSubject = result.data.subject;
        selectTeacher(result.id, result.data.name);
    } else if (result.type === 'subject') {
        // Navigate to subject
        currentGrade = { id: result.data.gradeId, name: result.data.gradeName };
        currentSubject = result.data.name;
        document.getElementById('subject-title').textContent = result.data.name;
        document.getElementById('subject-grade').textContent = result.data.gradeName;
        loadTeachers();
        showPage('teachers-page');
        updateBreadcrumb(`${result.data.gradeName} > ${result.data.name}`);
    }
    
    // Clear search
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
        globalSearch.value = '';
        document.getElementById('global-search-results').innerHTML = '';
    }
}

// Close modal on outside click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
});

// Smart Dark Mode - Initialize theme on page load
function initializeTheme() {
    // Check for saved preference (manual override)
    const savedTheme = localStorage.getItem('theme-preference');
    
    if (savedTheme) {
        // Use saved preference
        applyTheme(savedTheme);
    } else {
        // Detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
    }
    
    // Listen for system preference changes (only if no manual preference)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme-preference')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

// Apply theme to the page
function applyTheme(theme) {
    const body = document.body;
    const themeBtn = document.getElementById('theme-toggle-btn');
    const navThemeBtn = document.querySelector('.theme-toggle-nav i');
    
    if (theme === 'dark') {
        body.classList.add('dark-theme');
        if (themeBtn) themeBtn.textContent = '☀️';
        if (navThemeBtn) navThemeBtn.className = 'fas fa-sun';
    } else {
        body.classList.remove('dark-theme');
        if (themeBtn) themeBtn.textContent = '🌙';
        if (navThemeBtn) navThemeBtn.className = 'fas fa-moon';
    }
}

// Theme Toggle - Manual override
function toggleTheme() {
    const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Save manual preference (overrides system preference)
    localStorage.setItem('theme-preference', newTheme);
    applyTheme(newTheme);
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', initializeTheme);

// Show Attendance Table
function showAttendanceTable() {
    if (!currentStudent) return;
    
    const container = document.getElementById('attendance-table-container');
    container.innerHTML = '<div style="text-align:center;padding:20px;">جاري التحميل...</div>';
    
    document.getElementById('attendance-table-modal').classList.add('active');
    
    // Get attendance records
    db.collection('attendance')
        .where('studentId', '==', currentStudent.id)
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                showAttendanceError(container);
                return;
            }
            
            // Sort records by dateKey
            const records = [];
            snapshot.forEach(doc => {
                records.push(doc.data());
            });
            records.sort((a, b) => (b.dateKey || '').localeCompare(a.dateKey || ''));
            
            let table = '<table class="attendance-table">';
            table += '<thead><tr><th>التاريخ</th><th>اليوم</th><th>الحالة</th></tr></thead>';
            table += '<tbody>';
            
            records.slice(0, 30).forEach(record => {
                const statusClass = record.present ? 'status-present' : 'status-absent';
                const statusText = record.present ? '✓ حاضر' : '✗ غائب';
                const statusIcon = record.present ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-times-circle"></i>';
                
                table += `
                    <tr>
                        <td>${record.date}</td>
                        <td>${record.dayName}</td>
                        <td class="${statusClass}">${statusIcon} ${statusText}</td>
                    </tr>
                `;
            });
            
            table += '</tbody></table>';
            container.innerHTML = table;
        })
        .catch(error => {
            console.error('Error loading attendance:', error);
            container.innerHTML = '<div style="text-align:center;padding:20px;color:#f44336;">حدث خطأ في التحميل: ' + error.message + '</div>';
        });
}

// Quick Attendance from Search
function quickAttendance(studentId, isPresent, studentData, event) {
    event.stopPropagation();
    
    // Set current context
    currentStudent = { id: studentId, ...studentData };
    currentGrade = { id: studentData.gradeId, name: studentData.gradeName };
    currentSubject = studentData.subject;
    currentTeacher = { id: studentData.teacherId, name: studentData.teacherName };
    
    // Prepare date variables outside
    const today = new Date();
    const dayName = today.toLocaleDateString('ar-EG', { weekday: 'long' });
    const dateStr = today.toLocaleDateString('ar-EG', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    });
    const dateKey = today.toISOString().split('T')[0];
    const attendanceId = `${studentId}_${dateKey}`;
    
    // Get group info
    db.collection('groups').doc(studentData.groupId).get().then(groupDoc => {
        if (!groupDoc.exists) {
            customAlert('المجموعة غير موجودة', 'خطأ');
            return Promise.reject('group-not-found');
        }
        
        const group = groupDoc.data();
        currentGroup = { 
            id: studentData.groupId, 
            day: group.daysString || group.day,
            time: group.timesString || group.time
        };
        
        // Check if already recorded
        return db.collection('attendance').doc(attendanceId).get().then(doc => {
            if (doc.exists) {
                customAlert('تم تسجيل الحضور مسبقاً اليوم', 'تنبيه');
                return Promise.reject('already-recorded');
            }
            
            // Check if class day
            let isClassDay = false;
            if (group.days && Array.isArray(group.days)) {
                isClassDay = group.days.some(d => d.day === dayName);
            } else if (group.day) {
                isClassDay = group.day === dayName;
            }
            
            if (!isClassDay) {
                customConfirm(
                    `اليوم ليس يوم حصة!\nأيام الحصة: ${group.daysString || group.day}\n\nهل تريد التسجيل على أي حال؟`,
                    () => {
                        // Proceed with attendance
                        recordAttendance();
                    },
                    'تأكيد'
                );
                return Promise.reject('not-class-day-confirm');
            }
            
            return recordAttendance();
        });
    }).catch(error => {
        if (error !== 'already-recorded' && error !== 'not-class-day-confirm' && error !== 'group-not-found') {
            console.error('Error:', error);
            customAlert('حدث خطأ في تسجيل الحضور: ' + error.message, 'خطأ');
        }
    });
    
    function recordAttendance() {
        return db.collection('attendance').doc(attendanceId).set({
            studentId: studentId,
            groupId: studentData.groupId,
            present: isPresent,
            date: dateStr,
            dateKey: dateKey,
            dayName: dayName,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            return db.collection('students').doc(studentId).update({
                lastAttendanceDate: dateStr,
                lastAttendanceTimestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }).then(() => {
            customAlert(
                isPresent ? 'تم تسجيل الحضور بنجاح' : 'تم تسجيل الغياب بنجاح',
                'نجح'
            );
            // Clear search
            document.getElementById('global-search').value = '';
            document.getElementById('global-search-results').innerHTML = '';
        });
    }
}

// Share Student Link (Read-Only)
function shareStudentLink() {
    if (!currentStudent || !currentStudent.id) {
        alert('خطأ: لم يتم تحديد الطالب');
        return;
    }
    
    // Create share URL with dedicated share page
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/share.html?id=${currentStudent.id}`;
    
    // Copy to clipboard
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert(`✅ تم نسخ اللينك!\n\n${shareUrl}\n\nيمكنك إرساله لولي الأمر عبر واتساب أو أي وسيلة أخرى.\n\n🔒 اللينك للقراءة فقط - لا يمكن التعديل`);
        }).catch(() => {
            showShareUrlModal(shareUrl);
        });
    } else {
        showShareUrlModal(shareUrl);
    }
}

function showShareUrlModal(url) {
    const message = `اللينك جاهز:\n\n${url}\n\nانسخه وأرسله لولي الأمر`;
    alert(message);
}

// Load Shared Student Page (Read-Only)
function loadSharedStudent(studentId) {
    if (!db) {
        document.getElementById('shared-student-page').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div class="empty-state-text">خطأ في الاتصال بقاعدة البيانات</div>
            </div>
        `;
        return;
    }
    
    db.collection('students').doc(studentId).get().then(doc => {
        if (!doc.exists) {
            document.getElementById('shared-student-page').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <div class="empty-state-text">الطالب غير موجود</div>
                </div>
            `;
            showPage('shared-student-page');
            return;
        }
        
        const student = doc.data();
        
        // Set basic info
        document.getElementById('shared-student-name').textContent = student.name;
        document.getElementById('shared-student-info').textContent = `${student.subject || ''} - ${student.gradeName || ''}`;
        document.getElementById('shared-student-phone').textContent = student.phone || 'غير محدد';
        document.getElementById('shared-student-parent').textContent = student.parentPhone || 'غير محدد';
        
        // Payment status
        const currentMonth = getCurrentMonth();
        document.getElementById('shared-current-month').textContent = currentMonth;
        document.getElementById('shared-last-payment').textContent = student.lastPaymentMonth || 'لم يدفع بعد';
        
        const paymentStatus = document.getElementById('shared-student-payment');
        if (student.lastPaymentMonth === currentMonth) {
            paymentStatus.textContent = 'مدفوع';
            paymentStatus.className = 'value badge-green';
        } else {
            paymentStatus.textContent = 'لم يدفع';
            paymentStatus.className = 'value badge-red';
        }
        
        // Load grades
        loadSharedGrades(studentId);
        
        // Load attendance
        loadSharedAttendance(studentId);
        
        showPage('shared-student-page');
    }).catch(error => {
        console.error('Error loading shared student:', error);
        alert('حدث خطأ في تحميل البيانات');
    });
}

function loadSharedGrades(studentId) {
    const container = document.getElementById('shared-grades-list');
    container.innerHTML = '<div style="text-align:center;color:#666;">جاري التحميل...</div>';
    
    db.collection('grades')
        .where('studentId', '==', studentId)
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            container.innerHTML = '';
            
            if (snapshot.empty) {
                container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">لا توجد درجات بعد</div>';
                return;
            }
            
            snapshot.forEach(doc => {
                const grade = doc.data();
                const item = document.createElement('div');
                item.className = 'grade-item';
                item.innerHTML = `
                    <div class="grade-name">${grade.examName}</div>
                    <div class="grade-score">${grade.score}/${grade.total}</div>
                `;
                container.appendChild(item);
            });
        })
        .catch(error => {
            console.error('Error loading grades:', error);
            container.innerHTML = '<div style="text-align:center;color:#f44336;">خطأ في التحميل</div>';
        });
}

function loadSharedAttendance(studentId) {
    const container = document.getElementById('shared-attendance-table');
    container.innerHTML = '<div style="text-align:center;color:#666;">جاري التحميل...</div>';
    
    db.collection('attendance')
        .where('studentId', '==', studentId)
        .orderBy('timestamp', 'desc')
        .limit(30)
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">لا يوجد سجل حضور</div>';
                return;
            }
            
            let tableHTML = `
                <table class="attendance-table">
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>اليوم</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            snapshot.forEach(doc => {
                const record = doc.data();
                const statusClass = record.present ? 'status-present' : 'status-absent';
                const statusText = record.present ? '✓ حاضر' : '✗ غائب';
                const statusIcon = record.present ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-times-circle"></i>';
                
                tableHTML += `
                    <tr>
                        <td>${record.date || 'غير محدد'}</td>
                        <td>${record.dayName || '-'}</td>
                        <td class="${statusClass}">${statusIcon} ${statusText}</td>
                    </tr>
                `;
            });
            
            tableHTML += `
                    </tbody>
                </table>
            `;
            
            container.innerHTML = tableHTML;
        })
        .catch(error => {
            console.error('Error loading attendance:', error);
            container.innerHTML = '<div style="text-align:center;color:#f44336;">خطأ في التحميل</div>';
        });
}

// Check URL for shared student on page load
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('student');
    
    if (studentId) {
        // Wait for Firebase to initialize
        setTimeout(() => {
            loadSharedStudent(studentId);
        }, 1000);
    }
});

// Image Upload Variables
let currentExamImage = null;
let cameraStream = null;

// Preview Exam Image
function previewExamImage(input) {
    const preview = document.getElementById('exam-image-preview');
    const status = document.getElementById('upload-status');
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('حجم الصورة كبير جداً! الحد الأقصى 5 ميجابايت');
            input.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="معاينة">
                <button class="remove-image-btn" onclick="removeExamImage()">✕ إزالة الصورة</button>
            `;
            currentExamImage = file;
            status.textContent = '';
        };
        reader.readAsDataURL(file);
    }
}

function removeExamImage() {
    document.getElementById('exam-image-input').value = '';
    document.getElementById('exam-image-preview').innerHTML = '';
    document.getElementById('upload-status').textContent = '';
    currentExamImage = null;
}

// Camera Functions
function openCamera() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');
    
    modal.classList.add('active');
    
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        } 
    })
    .then(stream => {
        cameraStream = stream;
        video.srcObject = stream;
    })
    .catch(err => {
        console.error('Camera error:', err);
        alert('لا يمكن الوصول للكاميرا. تأكد من السماح بالوصول للكاميرا.');
        closeCameraModal();
    });
}

function capturePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    canvas.toBlob(blob => {
        const file = new File([blob], 'exam-photo.jpg', { type: 'image/jpeg' });
        currentExamImage = file;
        
        const preview = document.getElementById('exam-image-preview');
        preview.innerHTML = `
            <img src="${canvas.toDataURL()}" alt="معاينة">
            <button class="remove-image-btn" onclick="removeExamImage()">✕ إزالة الصورة</button>
        `;
        
        closeCameraModal();
    }, 'image/jpeg', 0.9);
}

function closeCameraModal() {
    const modal = document.getElementById('camera-modal');
    modal.classList.remove('active');
    
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

// Upload to ImgBB API
async function uploadImageToImgBB(file, onStatus) {
    try {
        onStatus && onStatus('جاري الرفع عبر ImgBB...');
        
        const formData = new FormData();
        formData.append('image', file);
        formData.append('key', 'efd9898834842fa6a911152397bbd357');
        
        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('فشل في رفع الصورة إلى ImgBB');
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data.data.url;
        } else {
            throw new Error('فشل في رفع الصورة: ' + (data.error?.message || 'خطأ غير معروف'));
        }
    } catch (e) {
        console.error('ImgBB upload error:', e);
        throw new Error('فشل في رفع الصورة: ' + e.message);
    }
}

// Modified addGrade function to include image
async function addGrade() {
    const examName = document.getElementById('exam-name-input').value.trim();
    const score = document.getElementById('exam-grade-input').value;
    const total = document.getElementById('exam-total-input').value;
    const statusDiv = document.getElementById('upload-status');
    
    if (!examName || !score || !total) {
        alert('من فضلك أكمل جميع البيانات');
        return;
    }
    
    if (!db) {
        alert('خطأ في الاتصال بقاعدة البيانات');
        return;
    }
    
    let imageUrl = null;
    
    // Upload image if exists
    if (currentExamImage) {
        try {
            statusDiv.className = 'upload-status uploading';
            statusDiv.textContent = '⏳ جاري رفع الصورة...';
            
            imageUrl = await uploadImageToImgBB(currentExamImage, (msg) => {
                statusDiv.textContent = msg;
            });
            
            statusDiv.className = 'upload-status success';
            statusDiv.textContent = '✓ تم رفع الصورة بنجاح';
        } catch (error) {
            statusDiv.className = 'upload-status error';
            statusDiv.textContent = '✗ ' + error.message;
            
            if (!confirm('فشل رفع الصورة. هل تريد المتابعة بدون صورة؟')) {
                return;
            }
        }
    }
    
    // Save grade with image URL
    db.collection('grades').add({
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        examName: examName,
        score: parseInt(score),
        total: parseInt(total),
        imageUrl: imageUrl,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('exam-name-input').value = '';
        document.getElementById('exam-grade-input').value = '';
        document.getElementById('exam-total-input').value = '';
        removeExamImage();
        closeModal();
        loadGrades(currentStudent.id);
        loadExamImages(currentStudent.id);
        alert('تم إضافة الدرجة بنجاح ✓');
    }).catch(error => {
        console.error('Error adding grade:', error);
        alert('حدث خطأ في الإضافة: ' + error.message);
    });
}

// Load Exam Images
function loadExamImages(studentId) {
    const container = document.getElementById('exam-images-gallery-island') || document.getElementById('exam-images-gallery');
    const section = document.getElementById('exam-images-section');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;color:var(--text-secondary);font-size:13px;padding:8px;">جاري التحميل...</div>';
    
    db.collection('grades')
        .where('studentId', '==', studentId)
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            container.innerHTML = '';
            
            // Filter grades with images
            const gradesWithImages = [];
            snapshot.forEach(doc => {
                const grade = doc.data();
                if (grade.imageUrl) {
                    gradesWithImages.push({ id: doc.id, data: grade });
                }
            });
            
            if (gradesWithImages.length === 0) {
                // Hide the section if no images
                if (section) section.style.display = 'none';
                return;
            }
            
            // Show the section if there are images
            if (section) section.style.display = 'block';
            
            container.className = 'exam-images-gallery';
            
            gradesWithImages.forEach(item => {
                const grade = item.data;
                const card = document.createElement('div');
                card.className = 'exam-image-card';
                card.innerHTML = `
                    <img src="${grade.imageUrl}" alt="${grade.examName}" onclick="openImageLightbox('${grade.imageUrl}')">
                    <div class="exam-image-info">
                        <div class="exam-image-name">${grade.examName}</div>
                        <div class="exam-image-score">${grade.score}/${grade.total}</div>
                    </div>
                    <button class="exam-image-delete" onclick="deleteExamImage('${item.id}', event)">✕</button>
                `;
                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error loading exam images:', error);
            container.innerHTML = '<div style="text-align:center;color:var(--danger-color);">خطأ في التحميل</div>';
        });
}

// Load Shared Exam Images (Read-Only)
function loadSharedExamImages(studentId) {
    const container = document.getElementById('shared-exam-images');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;color:#666;">جاري التحميل...</div>';
    
    db.collection('grades')
        .where('studentId', '==', studentId)
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            container.innerHTML = '';
            
            // Filter grades with images
            const gradesWithImages = [];
            snapshot.forEach(doc => {
                const grade = doc.data();
                if (grade.imageUrl) {
                    gradesWithImages.push(grade);
                }
            });
            
            if (gradesWithImages.length === 0) {
                container.className = 'exam-images-gallery empty';
                container.innerHTML = '📷 لا توجد صور امتحانات';
                return;
            }
            
            container.className = 'exam-images-gallery';
            
            gradesWithImages.forEach(grade => {
                const card = document.createElement('div');
                card.className = 'exam-image-card';
                card.innerHTML = `
                    <img src="${grade.imageUrl}" alt="${grade.examName}" onclick="openImageLightbox('${grade.imageUrl}')">
                    <div class="exam-image-info">
                        <div class="exam-image-name">${grade.examName}</div>
                        <div class="exam-image-score">${grade.score}/${grade.total}</div>
                    </div>
                `;
                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error loading exam images:', error);
            container.innerHTML = '<div style="text-align:center;color:#f44336;">خطأ في التحميل: ' + error.message + '</div>';
        });
}

// Delete Exam Image
function deleteExamImage(gradeId, event) {
    event.stopPropagation();
    
    if (!confirm('هل تريد حذف صورة الامتحان؟\nسيتم حذف الصورة فقط وليس الدرجة')) {
        return;
    }
    
    db.collection('grades').doc(gradeId).update({
        imageUrl: firebase.firestore.FieldValue.delete()
    }).then(() => {
        loadExamImages(currentStudent.id);
        alert('تم حذف الصورة ✓');
    }).catch(error => {
        console.error('Error deleting image:', error);
        alert('حدث خطأ في الحذف');
    });
}

// Image Lightbox
function openImageLightbox(imageUrl) {
    let lightbox = document.getElementById('image-lightbox');
    
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'image-lightbox';
        lightbox.className = 'image-lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <button class="lightbox-close" onclick="closeImageLightbox()">✕</button>
                <img src="" alt="صورة الامتحان">
            </div>
        `;
        document.body.appendChild(lightbox);
        
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) {
                closeImageLightbox();
            }
        });
    }
    
    lightbox.querySelector('img').src = imageUrl;
    lightbox.classList.add('active');
}

function closeImageLightbox() {
    const lightbox = document.getElementById('image-lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
    }
}

// Update selectStudent to load exam images
const originalSelectStudent = selectStudent;
selectStudent = function(studentId) {
    originalSelectStudent(studentId);
    setTimeout(() => {
        loadExamImages(studentId);
    }, 500);
};

// Update loadSharedStudent to load exam images
const originalLoadSharedStudent = loadSharedStudent;
loadSharedStudent = function(studentId) {
    originalLoadSharedStudent(studentId);
    setTimeout(() => {
        loadSharedExamImages(studentId);
    }, 1000);
};

// Share via WhatsApp
function shareViaWhatsApp() {
    if (!currentStudent || !currentStudent.id) {
        alert('خطأ: لم يتم تحديد الطالب');
        return;
    }
    
    if (!currentStudent.parentPhone) {
        alert('⚠️ لا يوجد رقم هاتف لولي الأمر!\nيرجى إضافة رقم الهاتف أولاً.');
        return;
    }
    
    // Create share URL
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/share.html?id=${currentStudent.id}`;
    
    // Format phone number
    let phone = currentStudent.parentPhone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
        phone = '2' + phone;
    } else if (!phone.startsWith('2')) {
        phone = '2' + phone;
    }
    
    // Create WhatsApp message
    const message = `السلام عليكم ورحمة الله وبركاته 🌟

يمكنك الاطلاع على بيانات الطالب/ة *${currentStudent.name}* من خلال الرابط التالي:

${shareUrl}

📋 يحتوي الرابط على:
• الدرجات والامتحانات
• صور الامتحانات
• سجل الحضور والغياب
• حالة الدفع

🔒 الرابط للقراءة فقط ولا يمكن التعديل

مع تحيات
🎓 سنتر التميز التعليمي`;
    
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}


/* ============================================
   CUSTOM POPUP SYSTEM
   ============================================ */

function showCustomPopup(title, message, buttons) {
    const overlay = document.getElementById('custom-popup-overlay');
    const titleEl = document.getElementById('popup-title');
    const messageEl = document.getElementById('popup-message');
    const buttonsEl = document.getElementById('popup-buttons');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    buttonsEl.innerHTML = '';
    
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = `custom-popup-btn ${btn.type || 'secondary'}`;
        button.textContent = btn.text;
        button.onclick = () => {
            closeCustomPopup();
            if (btn.onClick) btn.onClick();
        };
        buttonsEl.appendChild(button);
    });
    
    overlay.classList.add('active');
}

function closeCustomPopup() {
    const overlay = document.getElementById('custom-popup-overlay');
    overlay.classList.remove('active');
}

// Override alert function
window.customAlert = function(message, title = 'تنبيه') {
    showCustomPopup(title, message, [
        { text: 'حسناً', type: 'primary' }
    ]);
};

// Custom confirm function
window.customConfirm = function(message, onConfirm, title = 'تأكيد') {
    showCustomPopup(title, message, [
        { text: 'نعم', type: 'danger', onClick: onConfirm },
        { text: 'إلغاء', type: 'secondary' }
    ]);
};

// Show stats menu
function showStatsMenu() {
    showCustomPopup('📊 الإحصائيات', 'اختر نوع الإحصائيات:', [
        { text: '📅 إحصائيات اليوم', type: 'primary', onClick: sendTodayStatistics },
        { text: '📊 إحصائيات الشهر', type: 'primary', onClick: sendMonthStatistics },
        { text: 'إلغاء', type: 'secondary' }
    ]);
}


/* ============================================
   TASK 19: BOTTOM ACTION SHEET
   ============================================ */

// Show Contact Action Sheet
function showContactActionSheet() {
    const overlay = document.getElementById('contact-action-sheet');
    if (overlay) {
        overlay.classList.add('active');
    }
}

// Close Action Sheet
function closeActionSheet() {
    const overlay = document.getElementById('contact-action-sheet');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// Call Parent
function callParent() {
    if (!currentStudent || !currentStudent.parentPhone) {
        closeActionSheet();
        customAlert('لا يوجد رقم لولي الأمر', 'تنبيه');
        return;
    }
    
    closeActionSheet();
    const phone = currentStudent.parentPhone.replace(/\D/g, '');
    window.location.href = `tel:${phone}`;
}

// Call Student
function callStudent() {
    if (!currentStudent || !currentStudent.phone) {
        closeActionSheet();
        customAlert('لا يوجد رقم للطالب', 'تنبيه');
        return;
    }
    
    closeActionSheet();
    const phone = currentStudent.phone.replace(/\D/g, '');
    window.location.href = `tel:${phone}`;
}

// Contact Parent via WhatsApp
function contactParent() {
    if (!currentStudent || !currentStudent.parentPhone) {
        closeActionSheet();
        customAlert('لا يوجد رقم لولي الأمر', 'تنبيه');
        return;
    }
    
    closeActionSheet();
    sendWhatsAppMessage();
}

// Contact Student via WhatsApp
function contactStudent() {
    if (!currentStudent || !currentStudent.phone) {
        closeActionSheet();
        customAlert('لا يوجد رقم للطالب', 'تنبيه');
        return;
    }
    
    closeActionSheet();
    sendStudentInfo();
}

// Copy Share Link
function copyShareLink() {
    if (!currentStudent || !currentStudent.id) {
        alert('خطأ: لم يتم تحديد الطالب');
        closeActionSheet();
        return;
    }
    
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/share.html?id=${currentStudent.id}`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert(`✅ تم نسخ اللينك!\n\n${shareUrl}`);
            closeActionSheet();
        }).catch(() => {
            alert(`اللينك:\n\n${shareUrl}`);
            closeActionSheet();
        });
    } else {
        alert(`اللينك:\n\n${shareUrl}`);
        closeActionSheet();
    }
}

// Close action sheet when clicking backdrop
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('contact-action-sheet');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeActionSheet();
            }
        });
    }
    
    // Close developer modal when clicking backdrop
    const devModal = document.getElementById('developer-modal');
    if (devModal) {
        devModal.addEventListener('click', (e) => {
            if (e.target === devModal) {
                closeDeveloperModal();
            }
        });
    }
});

// Show developer info modal
function showDeveloperInfo() {
    const modal = document.getElementById('developer-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

// Close developer modal
function closeDeveloperModal() {
    const modal = document.getElementById('developer-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}


/* ============================================
   TASK 20: PAYMENT STATUS BADGES IN SEARCH
   ============================================ */

// Get payment status indicator HTML
function getPaymentIndicator(student) {
    const currentMonth = getCurrentMonth();
    const isPaid = student.lastPaymentMonth === currentMonth;
    
    if (isPaid) {
        return '<span class="payment-indicator paid" title="مدفوع"></span>';
    } else if (student.lastPaymentMonth) {
        return '<span class="payment-indicator unpaid" title="لم يدفع"></span>';
    } else {
        return '<span class="payment-indicator unknown" title="غير محدد"></span>';
    }
}


/* ============================================
   TASK 22: FRIENDLY ERROR STATES
   ============================================ */

// Create friendly empty state
function createFriendlyEmptyState(icon, title, description, onRetry) {
    const container = document.createElement('div');
    container.className = 'friendly-empty-state';
    
    container.innerHTML = `
        <div class="friendly-empty-icon">${icon}</div>
        <div class="friendly-empty-title">${title}</div>
        <div class="friendly-empty-description">${description}</div>
        ${onRetry ? '<button class="friendly-retry-btn" onclick="' + onRetry + '">إعادة المحاولة</button>' : ''}
    `;
    
    return container;
}

// Show friendly error for attendance
function showAttendanceError(container) {
    const emptyState = createFriendlyEmptyState(
        '📅',
        'لا توجد سجلات بعد',
        'لم يتم تسجيل أي حضور أو غياب حتى الآن',
        null
    );
    container.innerHTML = '';
    container.appendChild(emptyState);
}

// Show friendly error for students list
function showStudentsError(container, onRetry) {
    const emptyState = createFriendlyEmptyState(
        '👥',
        'لا يوجد طلاب',
        'لم يتم إضافة أي طلاب لهذه المجموعة بعد',
        onRetry
    );
    container.innerHTML = '';
    container.appendChild(emptyState);
}

// Show friendly error for grades
function showGradesError(container) {
    const emptyState = createFriendlyEmptyState(
        '📊',
        'لا توجد درجات',
        'لم يتم إضافة أي درجات لهذا الطالب بعد',
        null
    );
    container.innerHTML = '';
    container.appendChild(emptyState);
}

// Show friendly error for groups
function showGroupsError(container) {
    const emptyState = createFriendlyEmptyState(
        '🕒',
        'لا توجد مجموعات',
        'لم يتم إضافة أي مجموعات لهذا المدرس بعد',
        null
    );
    container.innerHTML = '';
    container.appendChild(emptyState);
}


/* ============================================
   TASK 21: PROFILE ISLANDS LAYOUT
   ============================================ */

// Create profile islands layout
function createProfileIslands(student) {
    const currentMonth = getCurrentMonth();
    const isPaid = student.lastPaymentMonth === currentMonth;
    
    return `
        <div class="profile-islands">
            <!-- Island 1: Identity -->
            <div class="profile-island island-identity">
                <div class="student-avatar">${student.name.charAt(0)}</div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin: 8px 0;">
                    <div class="student-name">${student.name}</div>
                    <button class="icon-btn-small" onclick="showEditStudentModal()" title="تعديل البيانات">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
                <div style="font-size: 13px; color: var(--text-secondary); margin: 4px 0;">
                    ${student.phone ? `📱 ${student.phone}` : ''}
                    ${student.phone && student.parentPhone ? ' • ' : ''}
                    ${student.parentPhone ? `👤 ${student.parentPhone}` : ''}
                </div>
                <div class="student-badges">
                    ${student.studentNumber ? `<span class="student-number">#${student.studentNumber}</span>` : ''}
                    ${isPaid ? '<span class="badge-green">مدفوع</span>' : '<span class="badge-red">لم يدفع</span>'}
                </div>
            </div>
            
            <!-- Island 2: Quick Actions -->
            <div class="profile-island island-quick-actions">
                <h3><i class="fas fa-bolt"></i> إجراءات سريعة</h3>
                <button class="btn-primary" onclick="showContactActionSheet()">
                    <i class="fas fa-phone"></i> تواصل
                </button>
                <button class="view-attendance-btn" onclick="showAttendanceTable()">
                    <i class="fas fa-calendar-check"></i> عرض جدول الحضور
                </button>
            </div>
            
            <!-- Island 3: Financial Status -->
            <div class="profile-island island-financial">
                <h3><i class="fas fa-wallet"></i> الحالة المالية</h3>
                <div class="financial-grid">
                    <div class="financial-item">
                        <div class="financial-label">الشهر الحالي</div>
                        <div class="financial-value">${currentMonth}</div>
                    </div>
                    <div class="financial-item">
                        <div class="financial-label">آخر دفعة</div>
                        <div class="financial-value">${student.lastPaymentMonth || 'لم يدفع'}</div>
                    </div>
                </div>
                <button class="payment-btn" onclick="showPaymentModal()" style="margin-top: 12px;">
                    💰 تسجيل دفعة جديدة
                </button>
            </div>
            
            <!-- Island 4: Academic -->
            <div class="profile-island island-academic" id="academic-island">
                <h3><i class="fas fa-graduation-cap"></i> الأداء الأكاديمي</h3>
                <div style="margin-top: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <h4 style="font-size: 14px; margin: 0; color: var(--text-secondary);">📊 الدرجات</h4>
                        <button class="add-btn-small" onclick="showAddGradeModal()" style="margin: 0; padding: 6px 12px; font-size: 13px;">+ إضافة</button>
                    </div>
                    <div id="grades-list-island" class="grades-list"></div>
                </div>
                <div style="margin-top: 12px;" id="exam-images-section">
                    <h4 style="font-size: 14px; margin-bottom: 8px; color: var(--text-secondary);">📸 صور الامتحانات</h4>
                    <div id="exam-images-gallery-island" class="exam-images-gallery"></div>
                </div>
            </div>
            
            <!-- Share Section -->
            <div class="profile-island">
                <button class="share-menu-btn" onclick="showShareMenu()" style="width: 100%; padding: 14px; background: var(--primary-color); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fas fa-share-alt"></i>
                    <span>مشاركة البيانات</span>
                </button>
            </div>
        </div>
    `;
}

// Show share menu
function showShareMenu() {
    showCustomPopup('📤 مشاركة البيانات', 'اختر طريقة المشاركة:', [
        { text: '📋 نسخ اللينك', type: 'primary', onClick: shareStudentLink },
        { text: '📲 إرسال عبر واتساب', type: 'primary', onClick: shareViaWhatsApp },
        { text: 'إلغاء', type: 'secondary' }
    ]);
}





/* ============================================
   DEVELOPER WIDGET - FAB & MODAL LOGIC
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const fabContainer = document.getElementById('fab-container');
    const fabButton = document.getElementById('fab-button');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const closeButton = document.getElementById('close-button');

    // Open Modal
    function openModal() {
        fabContainer.classList.add('hidden');
        modalOverlay.classList.add('active');
    }

    // Close Modal
    function closeModal() {
        modalOverlay.classList.remove('active');
        setTimeout(() => {
            fabContainer.classList.remove('hidden');
        }, 500);
    }

    // Event Listeners
    if (fabButton) {
        fabButton.addEventListener('click', openModal);
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }
    
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', closeModal);
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeModal();
        }
    });
});
