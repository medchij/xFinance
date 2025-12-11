# User Journey Tracker Commands

Таны browser console дээр дараах командуудыг ашиглаж болно:

## Journey Statistics
```javascript
// Journey статистик харах
userJourneyTracker.getJourneyStats()

// Сүүлийн 20 үйлдэл харах
userJourneyTracker.getRecentSteps(20)

// Navigation path харах
userJourneyTracker.getNavigationPath()

// User flow харах (хуудас бүрт хэдэн секунд байсан)
userJourneyTracker.getUserFlow()
```

## Filter by Category
```javascript
// Бүх click-үүд
userJourneyTracker.getStepsByCategory('click')

// Бүх navigation
userJourneyTracker.getStepsByCategory('navigation')

// Бүх form submission
userJourneyTracker.getStepsByCategory('form')

// Бүх алдаа
userJourneyTracker.getStepsByCategory('error')
```

## Export & Replay
```javascript
// Journey бүхэлдээ export хийх
userJourneyTracker.exportJourney()

// Journey-г дахин тоглуулах (1 секунд тутамд)
userJourneyTracker.replayJourney(1000)

// Journey цэвэрлэх
userJourneyTracker.clearJourney()
```

## Custom Tracking
```javascript
// Feature usage tracking
userJourneyTracker.trackFeatureUse('Excel Export', 'used', { rowCount: 100 })

// Search tracking
userJourneyTracker.trackSearch('invoice 2024', 15)

// Data export tracking
userJourneyTracker.trackDataExport('pdf', 25)

// Error tracking
userJourneyTracker.trackError('api_error', 'Connection timeout')
```

## Current Session Info
```javascript
// Session мэдээлэл
userJourneyTracker.currentSession

// Journey-н бүх алхам
userJourneyTracker.journey

// Нийт interactions
userJourneyTracker.interactions
```

## Performance + Journey Combined
```javascript
// Performance болон Journey хамтад нь
{
  performance: performanceMonitor.exportMetrics(),
  journey: userJourneyTracker.exportJourney()
}
```
