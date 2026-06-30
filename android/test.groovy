println "node output:"
println ['node', '--print', "require.resolve('react-native/package.json')"].execute(null, new File('X:/APP/echo/android')).text.trim()
